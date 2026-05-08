# 数学公式测试

本文档测试 KaTeX 数学公式的渲染效果，包括行内公式 `$...$` 和块级公式 `$$...$$`。

---

## 行内公式

- 质能方程：$E = mc^2$
- 勾股定理：$a^2 + b^2 = c^2$
- 欧拉公式：$e^{i\pi} + 1 = 0$
- 二次方程求根公式：$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
- 求和符号：$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$
- 极限：$\lim_{x \to 0} \frac{\sin x}{x} = 1$
- 导数：$f'(x) = \lim_{\Delta x \to 0} \frac{f(x + \Delta x) - f(x)}{\Delta x}$

一段混合文本：在 $\mathbb{R}^n$ 空间中，向量 $\vec{v} = (v_1, v_2, \ldots, v_n)$ 的范数为 $\|\vec{v}\| = \sqrt{\sum_{i=1}^{n} v_i^2}$。

---

## 块级公式

### 微积分

高斯积分：

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

牛顿-莱布尼茨公式：

$$
\int_a^b f(x) \, dx = F(b) - F(a)
$$

多重积分（球坐标）：

$$
\iiint_V f(r, \theta, \phi) \, r^2 \sin\theta \, dr \, d\theta \, d\phi
$$

### 级数与求和

巴塞尔问题：

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

泰勒展开（$e^x$）：

$$
e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!} = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots
$$

黎曼 Zeta 函数：

$$
\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s} = \prod_{p \text{ prime}} \frac{1}{1 - p^{-s}}
$$

### 线性代数

矩阵乘法：

$$
\begin{pmatrix}
a_{11} & a_{12} \\
a_{21} & a_{22}
\end{pmatrix}
\begin{pmatrix}
b_{11} & b_{12} \\
b_{21} & b_{22}
\end{pmatrix}
=
\begin{pmatrix}
a_{11}b_{11} + a_{12}b_{21} & a_{11}b_{12} + a_{12}b_{22} \\
a_{21}b_{11} + a_{22}b_{21} & a_{21}b_{12} + a_{22}b_{22}
\end{pmatrix}
$$

行列式：

$$
\det(A) = \begin{vmatrix}
a_{11} & a_{12} & a_{13} \\
a_{21} & a_{22} & a_{23} \\
a_{31} & a_{32} & a_{33}
\end{vmatrix}
= a_{11}(a_{22}a_{33} - a_{23}a_{32}) - a_{12}(a_{21}a_{33} - a_{23}a_{31}) + a_{13}(a_{21}a_{32} - a_{22}a_{31})
$$

特征值方程：

$$
A\vec{v} = \lambda\vec{v} \quad \Longleftrightarrow \quad \det(A - \lambda I) = 0
$$

### 概率与统计

贝叶斯定理：

$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

正态分布概率密度函数：

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)
$$

方差：

$$
\text{Var}(X) = E\left[(X - \mu)^2\right] = E[X^2] - (E[X])^2
$$

### 微分方程

热传导方程：

$$
\frac{\partial u}{\partial t} = \alpha \nabla^2 u
$$

薛定谔方程：

$$
i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \hat{H} \Psi(\mathbf{r}, t)
$$

纳维-斯托克斯方程：

$$
\rho \left(\frac{\partial \mathbf{v}}{\partial t} + \mathbf{v} \cdot \nabla \mathbf{v}\right) = -\nabla p + \mu \nabla^2 \mathbf{v} + \mathbf{f}
$$

### 集合与逻辑

$$
\forall \epsilon > 0, \exists \delta > 0 : |x - a| < \delta \implies |f(x) - L| < \epsilon
$$

$$
A \cup B = \{x : x \in A \lor x \in B\}
$$

$$
|A \cup B| = |A| + |B| - |A \cap B|
$$

### 对齐多行公式

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

### 分段函数

$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}
$$

$$
|x| = \begin{cases}
x & x \geq 0 \\
-x & x < 0
\end{cases}
$$

### 特殊符号集合

希腊字母：$\alpha, \beta, \gamma, \delta, \epsilon, \zeta, \eta, \theta, \iota, \kappa, \lambda, \mu, \nu, \xi, \pi, \rho, \sigma, \tau, \upsilon, \phi, \chi, \psi, \omega$

大写希腊字母：$\Gamma, \Delta, \Theta, \Lambda, \Xi, \Pi, \Sigma, \Phi, \Psi, \Omega$

数学字体：

- 黑板粗体：$\mathbb{R}, \mathbb{Z}, \mathbb{Q}, \mathbb{C}, \mathbb{N}$
- 花体：$\mathcal{F}, \mathcal{L}, \mathcal{H}, \mathcal{O}$
- 哥特体：$\mathfrak{g}, \mathfrak{h}, \mathfrak{sl}(2)$

运算符：$\oplus, \otimes, \odot, \circ, \bullet, \star, \dagger, \ddagger$

箭头：$\to, \mapsto, \Rightarrow, \Leftrightarrow, \hookrightarrow, \twoheadrightarrow, \xrightarrow{f}$
