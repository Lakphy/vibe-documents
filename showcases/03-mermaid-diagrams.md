# Mermaid 图表测试

本文档测试所有 Mermaid 图表类型的渲染效果。
Mermaid 支持深色/浅色主题自动切换。

---

## 流程图 (Flowchart)

### 基础流程图

```mermaid
graph TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作 A]
    B -->|否| D[执行操作 B]
    C --> E[结束]
    D --> E
```

### 复杂流程图

```mermaid
graph LR
    A[用户请求] --> B[负载均衡器]
    B --> C[API 网关]
    C --> D{认证检查}
    D -->|通过| E[业务服务]
    D -->|失败| F[返回 401]
    E --> G[(数据库)]
    E --> H[(Redis 缓存)]
    G --> I[数据处理]
    H --> I
    I --> J[响应序列化]
    J --> K[返回结果]
    F --> K
```

### 子图 (Subgraph)

```mermaid
graph TB
    subgraph Frontend["前端应用"]
        A[React App] --> B[状态管理]
        A --> C[路由]
        B --> D[API 层]
    end
    subgraph Backend["后端服务"]
        E[Express Server] --> F[中间件]
        F --> G[控制器]
        G --> H[服务层]
        H --> I[(PostgreSQL)]
        H --> J[(Redis)]
    end
    D --> E
```

---

## 时序图 (Sequence Diagram)

### 基础时序图

```mermaid
sequenceDiagram
    participant U as 用户
    participant B as 浏览器
    participant S as 服务器
    participant DB as 数据库

    U->>B: 点击登录按钮
    B->>S: POST /api/login
    S->>DB: 查询用户信息
    DB-->>S: 返回用户数据
    S->>S: 验证密码
    alt 验证成功
        S-->>B: 200 + JWT Token
        B->>B: 存储 Token
        B-->>U: 跳转到首页
    else 验证失败
        S-->>B: 401 Unauthorized
        B-->>U: 显示错误信息
    end
```

### 带注释和循环的时序图

```mermaid
sequenceDiagram
    participant C as Client
    participant LB as LoadBalancer
    participant S1 as Server-1
    participant S2 as Server-2
    participant Q as MessageQueue

    Note over C, Q: WebSocket 连接建立流程

    C->>LB: WS handshake
    LB->>S1: 转发连接
    S1-->>C: WS connected

    loop 心跳检测
        C->>S1: ping
        S1-->>C: pong
    end

    C->>S1: 发送消息
    S1->>Q: 入队消息
    Q->>S2: 分发消息
    S2-->>C: 推送通知

    Note right of Q: 消息会持久化到磁盘
```

---

## 甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    excludes    weekends

    section 需求分析
    需求调研          :done, req1, 2024-01-01, 5d
    需求评审          :done, req2, after req1, 2d
    PRD 编写          :done, req3, after req2, 3d

    section 设计阶段
    架构设计          :done, des1, after req3, 4d
    UI/UX 设计        :active, des2, after req3, 6d
    API 设计          :done, des3, after des1, 3d

    section 开发阶段
    前端开发          :dev1, after des2, 15d
    后端开发          :dev2, after des3, 12d
    联调测试          :dev3, after dev1, 5d

    section 上线
    性能优化          :opt1, after dev3, 3d
    灰度发布          :opt2, after opt1, 2d
    全量发布          :milestone, after opt2, 0d
```

---

## 类图 (Class Diagram)

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
        +move() void
    }
    class Dog {
        +String breed
        +fetch() void
        +makeSound() void
    }
    class Cat {
        +bool isIndoor
        +purr() void
        +makeSound() void
    }
    class Pet {
        <<interface>>
        +String owner
        +feed() void
        +play() void
    }

    Animal <|-- Dog
    Animal <|-- Cat
    Pet <|.. Dog
    Pet <|.. Cat
    Animal "1" --> "*" Food : eats
```

---

## 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Loading: fetch()
    Loading --> Success: 200 OK
    Loading --> Error: network error
    Loading --> Error: timeout

    Success --> Idle: reset()
    Error --> Loading: retry()
    Error --> Idle: cancel()

    state Loading {
        [*] --> Requesting
        Requesting --> Parsing: response received
        Parsing --> [*]: done
    }

    Success --> [*]
```

---

## ER 图 (Entity Relationship)

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id PK
        string name
        string email UK
        datetime created_at
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int id PK
        int user_id FK
        decimal total
        string status
        datetime order_date
    }
    ORDER_ITEM }|--|| PRODUCT : references
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal price
    }
    PRODUCT {
        int id PK
        string name
        string category
        decimal price
        int stock
    }
    PRODUCT }|--|| CATEGORY : belongs_to
    CATEGORY {
        int id PK
        string name
        string description
    }
```

---

## 饼图 (Pie Chart)

```mermaid
pie title 技术栈使用占比
    "TypeScript" : 35
    "React" : 25
    "Python" : 15
    "Go" : 12
    "Rust" : 8
    "Other" : 5
```

---

## Git Graph

```mermaid
gitGraph
    commit id: "初始化项目"
    commit id: "添加基础结构"
    branch develop
    checkout develop
    commit id: "feat: 用户认证"
    commit id: "feat: 数据模型"
    branch feature/api
    checkout feature/api
    commit id: "feat: REST API"
    commit id: "feat: 中间件"
    checkout develop
    merge feature/api id: "合并 API 分支"
    checkout main
    merge develop id: "v1.0.0 发布"
    commit id: "hotfix: 修复登录"
```

---

## 用户旅程图 (User Journey)

```mermaid
journey
    title 用户购物旅程
    section 浏览
      打开网站: 5: 用户
      搜索商品: 4: 用户
      浏览详情: 3: 用户
    section 下单
      加入购物车: 4: 用户
      填写地址: 2: 用户
      选择支付方式: 3: 用户
      确认订单: 4: 用户
    section 售后
      等待发货: 2: 用户
      收到商品: 5: 用户
      评价商品: 3: 用户
```

---

## 思维导图 (Mindmap)

```mermaid
mindmap
  root((Vibe Documents))
    渲染引擎
      Streamdown
      Shiki 高亮
      KaTeX 数学
      Mermaid 图表
    编辑器
      Milkdown WYSIWYG
      CodeMirror 6
      双向同步
    主题
      跟随 VS Code
      深色主题
      浅色主题
    扩展功能
      Excalidraw
      CJK 排版
      任务列表
```

---

## 时间线 (Timeline)

```mermaid
timeline
    title 产品发展历程
    2023 Q1 : 项目启动
             : 技术选型
    2023 Q2 : 核心功能开发
             : 内部测试
    2023 Q3 : Beta 版本发布
             : 用户反馈收集
    2023 Q4 : 性能优化
             : v1.0 正式发布
    2024 Q1 : 国际化支持
             : 插件生态
    2024 Q2 : AI 集成
             : 企业版
```
