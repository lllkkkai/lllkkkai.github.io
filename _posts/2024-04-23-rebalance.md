---
layout: post
category: mq
---
# kafka的重平衡机制
重平衡规定了如何让消费者组下的所有消费者来分配topic中的每一个分区。

重平衡的触发条件：
1. 消费者组内成员发生变更（消费者减少/增加）
2. 主题的分区发生变更（分区新增）
3. 订阅的主题发生变化

为什么要关注rebalance？
> 重平衡的过程中，消费者无法从kafka中消费消息，影响TPS
>
> 如果kafka集群内节点较多，耗时可能会很长，此时kafka将不可用

## 重平衡的通知机制

重平衡的通知机制依赖于 Kafka 消费者的**心跳机制（Heartbeat）**：
1. 消费者后台线程定期向 Group Coordinator（协调者 Broker）发送心跳请求。
2. 当 Coordinator 判定需要触发重平衡时，它会在该组所有消费者的下一个心跳响应中返回 `REBALANCE_IN_PROGRESS` 错误码。
3. 消费者收到该响应后，即知晓需要重平衡，随即停止当前的消息消费拉取，进入 `JoinGroup` 和 `SyncGroup` 阶段重新协商并接管分区。