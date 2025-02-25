---
layout: post
category: Java
---

## ConcurrentHashMap
诞生的背景：多线程环境下，使用HashMap不安全，使用Hashtable有性能问题；

###  **Hashtable** 的性能瓶颈

Hashtable 是 Java 早期提供的线程安全哈希表，它通过在所有方法上加锁（synchronized）来实现线程安全。这种方式存在以下问题：

粗粒度锁：Hashtable 使用单一的全局锁，所有操作都需要竞争锁，导致并发性能差。
高竞争：在多线程环境下，锁竞争会显著降低性能。 ConcurrentHashMap 通过更细粒度的锁机制解决了这些问题。

Hashtable的源码分析
```Java
// 内部采用Entry数组存储键值对数据，Entry实际为单向链表的表头
private transient Entry<?,?>[] table;
// HashTable里键值对个数
private transient int count;
// 扩容阈值，当超过这个值时，进行扩容操作，计算方式为：数组容量*加载因子
private int threshold;
// 加载因子
private float loadFactor;
// 用于快速失败
private transient int modCount = 0;

// 方法synchronized修饰，线程安全，多线程共享一个hashtable对象时，同一时刻只有一个线程能读取和修改Hashtable
public synchronized V put(K key, V value) {
    // Make sure the value is not null
    if (value == null) {
        throw new NullPointerException();
    }

    // Makes sure the key is not already in the hashtable.
    Entry<?,?> tab[] = table;
    // 得到key的哈希值
    int hash = key.hashCode();
    // 得到该key存在到数组中的下标
    int index = (hash & 0x7FFFFFFF) % tab.length;
    @SuppressWarnings("unchecked")
    // 得到该下标对应的Entry
    Entry<K,V> entry = (Entry<K,V>)tab[index];
    // 如果该下标的Entry不为null，则进行链表遍历
    for(; entry != null ; entry = entry.next) {
        // 遍历链表，如果存在key相等的节点，则替换这个节点的值，并返回旧值
        if ((entry.hash == hash) && entry.key.equals(key)) {
            V old = entry.value;
            entry.value = value;
            return old;
        }
    }
    // 如果数组下标对应的节点为空，或者遍历链表后发现没有和该key相等的节点，则执行插入操作
    addEntry(hash, key, value, index);
    return null;
}

private void addEntry(int hash, K key, V value, int index) {
    // 模数+1
    modCount++;

    Entry<?,?> tab[] = table;
    // 判断是否需要扩容
    if (count >= threshold) {
        // 如果count大于等于扩容阈值，则进行扩容
        rehash();

        tab = table;
        // 扩容后，重新计算该key在扩容后table里的下标
        hash = key.hashCode();
        index = (hash & 0x7FFFFFFF) % tab.length;
    }

    // Creates the new entry.
    @SuppressWarnings("unchecked")
    // 采用头插的方式插入，index位置的节点为新节点的next节点
    // 新节点取代inde位置节点
    Entry<K,V> e = (Entry<K,V>) tab[index];
    tab[index] = new Entry<>(hash, key, value, e);
    // count+1
    count++;
}

public synchronized V get(Object key) {
    Entry<?,?> tab[] = table;
    int hash = key.hashCode();
    // 根据key哈希得到index，遍历链表取值
    int index = (hash & 0x7FFFFFFF) % tab.length;
    for (Entry<?,?> e = tab[index] ; e != null ; e = e.next) {
        if ((e.hash == hash) && e.key.equals(key)) {
            return (V)e.value;
        }
    }
    return null;
}

protected void rehash() {
    // 暂存旧的table和容量
    int oldCapacity = table.length;
    Entry<?,?>[] oldMap = table;

    // 新容量为旧容量的2n+1倍
    int newCapacity = (oldCapacity << 1) + 1;
    // 判断新容量是否超过最大容量
    if (newCapacity - MAX_ARRAY_SIZE > 0) {
        // 如果旧容量已经是最大容量大话，就不扩容了
        if (oldCapacity == MAX_ARRAY_SIZE)
            // Keep running with MAX_ARRAY_SIZE buckets
            return;
        // 新容量最大值只能是MAX_ARRAY_SIZE
        newCapacity = MAX_ARRAY_SIZE;
    }
    // 用新容量创建一个新Entry数组
    Entry<?,?>[] newMap = new Entry<?,?>[newCapacity];
    // 模数+1
    modCount++;
    // 重新计算下次扩容阈值
    threshold = (int)Math.min(newCapacity * loadFactor, MAX_ARRAY_SIZE + 1);
    // 将新Entry数组赋值给table
    table = newMap;
    // 遍历数组和链表，进行新table赋值操作
    for (int i = oldCapacity ; i-- > 0 ;) {
        for (Entry<K,V> old = (Entry<K,V>)oldMap[i] ; old != null ; ) {
            Entry<K,V> e = old;
            old = old.next;

            int index = (e.hash & 0x7FFFFFFF) % newCapacity;
            e.next = (Entry<K,V>)newMap[index];
            newMap[index] = e;
        }
    }
}
```
#### 与Hashtable的区别是什么？

- Hashtable也是线程安全的，但每次要锁住整个结构，并发性低。相比之下，ConcurrentHashMap获取size时才锁整个对象。

- Hashtable对get/put/remove都使用了同步操作。ConcurrentHashMap只对put/remove同步。

- Hashtable是快速失败的，遍历时改变结构会报错ConcurrentModificationException。ConcurrentHashMap是安全失败，允许并发检索和更新。

### 2. **HashMap** 的非线程安全
HashMap 是非线程安全的，在多线程环境下可能出现以下问题：

- 数据不一致：多线程同时修改 HashMap 可能导致内部结构破坏。

- 死循环：在扩容时，多线程可能引发死循环（JDK 1.7 中的经典问题）。 ConcurrentHashMap 提供了线程安全的实现，避免了这些问题。


## 线程安全的Map
在多线程环境下，Java 提供了几种线程安全的 Map 实现，可以安全地进行并发操作：
1. ConcurrentHashMap: 这是一个线程安全的哈希表实现，它通过将数据分为多个段，每个段都有自己的锁，从而允许多个线程同时访问不同段的数据。在 Java 8 中，ConcurrentHashMap 还引入了红黑树来处理哈希冲突严重的情况，进一步提高了查找效率。
2. Collections.synchronizedMap(): 这是一个工具方法，可以将任何 Map 包装成一个线程安全的 Map。这个包装后的 Map 通过在所有方法上使用 synchronized 关键字来实现线程安全。但是，这种方法的并发性能可能不如 ConcurrentHashMap，因为它在任何时候只允许一个线程访问整个 Map。
3. Hashtable: 这是一个旧的线程安全的哈希表实现，它也通过在所有方法上使用 synchronized 关键字来实现线程安全。但是，由于其设计和性能问题，现在通常推荐使用 ConcurrentHashMap 或 Collections.synchronizedMap() 代替 Hashtable。

除了使用这些线程安全的 Map 实现外，还可以通过使用锁或其他并发控制机制（如 ReentrantLock、Semaphore、CountDownLatch 等）来手动同步对 Map 的访问。但是，这通常需要更多的编程工作，并且如果不正确地使用这些机制，可能会导致死锁或数据不一致的问题。

## ConcurrentHashmap的数据结构
Node数组+链表/红黑树
![alt text](../assets/img/ConcurrentHashmap8.png)

## JDK1.8中线程安全的体现
### get
```Java
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    // key 所在的 hash 位置
    int h = spread(key.hashCode());
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        // 如果指定位置元素存在，头结点hash值相同
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                // key hash 值相等，key值相同，直接返回元素 value
                return e.val;
        }
        else if (eh < 0)
            // 头结点hash值小于0，说明正在扩容或者是红黑树，find查找
            return (p = e.find(h, key)) != null ? p.val : null;
        while ((e = e.next) != null) {
            // 是链表，遍历查找
            if (e.hash == h &&
                ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
    return null;
}
```
`ConcurrentHashMap` 的 `get` 方法通过以下几种方式保证了线程安全：

#### 1. 使用 `Unsafe` 类的原子操作
在 `ConcurrentHashMap` 中，获取数组元素使用了 `Unsafe` 类的原子操作，例如 `tabAt` 方法（通常在底层是通过 `Unsafe` 类的 `getObjectVolatile` 方法实现）。

```java
static final <K,V> Node<K,V> tabAt(Node<K,V>[] tab, int i) {
    return (Node<K,V>)U.getObjectVolatile(tab, ((long)i << ASHIFT) + ABASE);
}
```
`getObjectVolatile` 方法是一个原子操作，它可以保证在多线程环境下读取数组元素时的可见性和原子性。也就是说，当一个线程更新了数组中的某个元素时，其他线程能够立即看到这个更新。这样，在 `get` 方法中通过 `tabAt` 获取桶中的元素时，不会出现读到过期数据的情况。

#### 2. 对特殊节点的处理
`ConcurrentHashMap` 中的节点可能有不同的类型，如普通链表节点、红黑树节点（`TreeNode`）和扩容时的转发节点（`ForwardingNode`）。

- **红黑树节点（`TreeNode`）**：当桶中的元素以红黑树形式存储时，`get` 方法会调用 `TreeNode` 的 `find` 方法进行查找。红黑树本身是一种自平衡的二叉搜索树，并且在 `ConcurrentHashMap` 中对红黑树的操作进行了并发控制，保证在多线程环境下查找操作的正确性。
- **转发节点（`ForwardingNode`）**：在扩容过程中，某些桶会被标记为 `ForwardingNode`。当 `get` 方法遇到 `ForwardingNode` 时，会根据 `ForwardingNode` 提供的信息，到新的数组中继续查找元素。由于扩容操作是有组织地进行的，并且 `ForwardingNode` 本身也是线程安全的，所以不会影响 `get` 操作的正确性。

#### 3. 无锁设计
`get` 方法在整个执行过程中不需要加锁。这是因为 `ConcurrentHashMap` 的设计理念是尽量减少锁的使用，以提高并发性能。在 `get` 操作中，通过原子操作和对不同节点类型的正确处理，避免了线程之间的竞争和冲突，从而在不使用锁的情况下保证了线程安全。

#### 4. 可见性保证
`ConcurrentHashMap` 的 `table` 数组是使用 `volatile` 关键字修饰的。`volatile` 关键字保证了 `table` 数组的可见性，即当一个线程对 `table` 数组进行更新时，其他线程能够立即看到这个更新。在 `get` 方法中，每次都会读取最新的 `table` 数组，从而保证了操作的一致性。

综上所述，`ConcurrentHashMap` 的 `get` 方法通过 `Unsafe` 类的原子操作、对特殊节点的正确处理、无锁设计以及 `volatile` 关键字保证的可见性，在多线程环境下实现了线程安全的查找操作。 

### put
ConcurrentHashMap 使用的是 CAS + volatile 或 synchronized 的方式来保证线程安全的：
```Java
/*
     * 当添加一对键值对的时候，首先会去判断保存这些键值对的数组是不是初始化了，
     * 如果没有的话就初始化数组
     *  然后通过计算hash值来确定放在数组的哪个位置
     * 如果这个位置为空则直接添加，如果不为空的话，则取出这个节点来
     * 如果取出来的节点的hash值是MOVED(-1)的话，则表示当前正在对这个数组进行扩容，复制到新的数组，则当前线程也去帮助复制
     * 最后一种情况就是，如果这个节点，不为空，也不在扩容，则通过synchronized来加锁，进行添加操作
     *    然后判断当前取出的节点位置存放的是链表还是树
     *    如果是链表的话，则遍历整个链表，直到取出来的节点的key来个要放的key进行比较，如果key相等，并且key的hash值也相等的话，
     *          则说明是同一个key，则覆盖掉value，否则的话则添加到链表的末尾
     *    如果是树的话，则调用putTreeVal方法把这个元素添加到树中去
     *  最后在添加完成之后，会判断在该节点处共有多少个节点（注意是添加前的个数），如果达到8个以上了的话，
     *  则调用treeifyBin方法来尝试将处的链表转为树，或者扩容数组
     */
    final V putVal(K key, V value, boolean onlyIfAbsent) {
        if (key == null || value == null) throw new NullPointerException();//K,V都不能为空，否则的话跑出异常
        int hash = spread(key.hashCode());    //取得key的hash值
        int binCount = 0;    //用来计算在这个节点总共有多少个元素，用来控制扩容或者转移为树
        for (Node<K,V>[] tab = table;;) {    //
            Node<K,V> f; int n, i, fh;
            if (tab == null || (n = tab.length) == 0)    
                tab = initTable();    //第一次put的时候table没有初始化，则初始化table
            else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {    //通过哈希计算出一个表中的位置因为n是数组的长度，所以(n-1)&hash肯定不会出现数组越界
                if (casTabAt(tab, i, null,        //如果这个位置没有元素的话，则通过cas的方式尝试添加，注意这个时候是没有加锁的
                             new Node<K,V>(hash, key, value, null)))        //创建一个Node添加到数组中区，null表示的是下一个节点为空
                    break;                   // no lock when adding to empty bin
            }
            /*
             * 如果检测到某个节点的hash值是MOVED，则表示正在进行数组扩张的数据复制阶段，
             * 则当前线程也会参与去复制，通过允许多线程复制的功能，一次来减少数组的复制所带来的性能损失
             */
            else if ((fh = f.hash) == MOVED)    
                tab = helpTransfer(tab, f);
            else {
                /*
                 * 如果在这个位置有元素的话，就采用synchronized的方式加锁，
                 *     如果是链表的话(hash大于0)，就对这个链表的所有元素进行遍历，
                 *         如果找到了key和key的hash值都一样的节点，则把它的值替换到
                 *         如果没找到的话，则添加在链表的最后面
                 *  否则，是树的话，则调用putTreeVal方法添加到树中去
                 *  
                 *  在添加完之后，会对该节点上关联的的数目进行判断，
                 *  如果在8个以上的话，则会调用treeifyBin方法，来尝试转化为树，或者是扩容
                 */
                V oldVal = null;
                synchronized (f) {
                    if (tabAt(tab, i) == f) {        //再次取出要存储的位置的元素，跟前面取出来的比较
                        if (fh >= 0) {                //取出来的元素的hash值大于0，当转换为树之后，hash值为-2
                            binCount = 1;            
                            for (Node<K,V> e = f;; ++binCount) {    //遍历这个链表
                                K ek;
                                if (e.hash == hash &&        //要存的元素的hash，key跟要存储的位置的节点的相同的时候，替换掉该节点的value即可
                                    ((ek = e.key) == key ||
                                     (ek != null && key.equals(ek)))) {
                                    oldVal = e.val;
                                    if (!onlyIfAbsent)        //当使用putIfAbsent的时候，只有在这个key没有设置值得时候才设置
                                        e.val = value;
                                    break;
                                }
                                Node<K,V> pred = e;
                                if ((e = e.next) == null) {    //如果不是同样的hash，同样的key的时候，则判断该节点的下一个节点是否为空，
                                    pred.next = new Node<K,V>(hash, key,        //为空的话把这个要加入的节点设置为当前节点的下一个节点
                                                              value, null);
                                    break;
                                }
                            }
                        }
                        else if (f instanceof TreeBin) {    //表示已经转化成红黑树类型了
                            Node<K,V> p;
                            binCount = 2;
                            if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,    //调用putTreeVal方法，将该元素添加到树中去
                                                           value)) != null) {
                                oldVal = p.val;
                                if (!onlyIfAbsent)
                                    p.val = value;
                            }
                        }
                    }
                }
                if (binCount != 0) {
                    if (binCount >= TREEIFY_THRESHOLD)    //当在同一个节点的数目达到8个的时候，则扩张数组或将给节点的数据转为tree
                        treeifyBin(tab, i);    
                    if (oldVal != null)
                        return oldVal;
                    break;
                }
            }
        }
        addCount(1L, binCount);    //计数
        return null;
    }
```
添加元素时首先会判断容器是否为空，如果为空则使用 volatile 加 CAS 来初始化。

如果容器不为空则根据存储的元素计算该位置是否为空，如果为空则利用 CAS 设置该节点；

如果不为空则使用 synchronize 加锁，遍历桶中的数据，替换或新增节点到桶中，最后再判断是否需要转为红黑树，这样就能保证并发访问时的线程安全了。

我们把上述流程简化一下，我们可以简单的认为在 JDK 1.8 中，ConcurrentHashMap 是在头节点加锁来保证线程安全的，锁的粒度相比 Segment 来说更小了，发生冲突和加锁的频率降低了，并发操作的性能就提高了。而且 JDK 1.8 使用的是红黑树优化了之前的固定链表，那么当数据量比较大的时候，查询性能也得到了很大的提升，从之前的 O(n) 优化到了 O(logn) 的时间复杂度。

### 扩容
