---
title: Linear Regression
description: A simple algorithm to fit data points using a linear function.
---

# What is regression

Regression aims to predict numerical values (including continuous data, or discrete data such as human counts). In comparison, classification predicts the category to which a sample belongs.

For example, predicting whether tomorrow will be sunny, rainy, or cloudy is a classification problem, whereas predicting tomorrow's temperature is a regression problem.

Using certain methods, we can convert some classification problems into regression problems, such as setting a threshold after fitting a function using a regression algorithm. For example, we can predict whether it will be rainy tomorrow by first using regression to predict the probability of precipitation (for illustration, in reality the prediction is usually done through other probabilistic models), and then setting a threshold.

# Simple linear regression
## When to use it
Simple linear regression is one of the simplest and easiest-to-understand machine learning algorithms. Given data points, with a one-dimensional independent variable x and a one-dimensional dependent variable y, that are scattered approximately in a straight line in a Cartesian coordinate system, we can use linear regression to fit these data points.

## Fitting process
For most machine learning algorithms, we need a function to evaluate how well the model fits the data, which is called a *loss function*. Normally, a loss function is non-negative, and the process of fitting is trying to reach a minimum value with the loss function.

Assuming we have data points $(x_1, y_1), (x_2, y_2), \ldots, (x_n, y_n)$ that lie approximately along a straight line, then for linear regression, we can assume that the linear function is: $y = kx + b$. We can define a loss function:

$Loss = \sum_{i=1}^{n}(y_i - \hat{y}_i)^2 = \sum_{i=1}^{n}(y_i - (kx_i + b))^2$

Here, $(x_i, y_i)$ are actual data points, while $\hat{y}_i$ is the predicted value obtained by substituting $x_i$ into the linear function.

This loss function is called Sum of Squared Errors (SSE), and it is one of the most commonly used loss functions in regression algorithms. Error, or residual, means the difference between the actual value and the predicted value. Squaring the residuals is for eliminating negative values, avoiding the positive and negative residuals cancelling out, while giving more penalties on larger residuals. With the definition of the loss function and the given data points, the loss function is a quadratic function with two variables:

$Loss = \sum_{i=1}^{n}(y_i - (kx_i + b))^2 = \sum_{i=1}^{n}(y_i)^2 + \sum_{i=1}^{n}(x_i)^2k^2 + nb^2 - 2\sum_{i=1}^{n}(x_iy_i)k - 2\sum_{i=1}^{n}(y_i)b + 2\sum_{i=1}^{n}(x_i)kb$

Because the loss function is a sum of squares of affine functions (polynomial functions of total degree at most one) of the parameters $k$ and $b$, if we plot a curved surface in a three dimensional coordinate system, then it is a convex surface that has an upwards opening which has one minimum point (p.s. when all $x$ values are the same, the loss function would degenerate into a parabolic cylinder, where the minimizing points forms a straight line, and thus the minimum point is not unique - but this situation hardly appears in practice). Apparently, it can be achieved when the differentiation equals 0. By taking partial derivatives with respect to $k$ and $b$, we get the following equations:

$\frac{\partial Loss}{\partial k} = 2\sum_{i=1}^{n}x_i(kx_i + b - y_i) = 0$

$\frac{\partial Loss}{\partial b} = 2\sum_{i=1}^{n}(kx_i + b - y_i) = 0$

By putting the data into the equations, we get a system of two linear equations in $k$ and $b$. By solving the system, we get the linear function $y = kx + b$ with the loss function reaching the minimum value.

# Multiple linear regression

When each sample has $d$ input features, the $i$-th sample can be represented as $(\mathbf{x}_i, y_i)$. Here, $\mathbf{x}_i=(x_{i1}, x_{i2}, \ldots, x_{id})$ is the input vector, $x_{ij}$ is the $j$-th feature of the $i$-th sample, and $y_i$ is the observed value. The predicted value for this sample is:

$\hat{y}_i = \alpha_0 + \alpha_1x_{i1} + \alpha_2x_{i2} + \ldots + \alpha_dx_{id}$

As in simple linear regression, we define a loss function, take its partial derivatives with respect to each coefficient, set them to zero to obtain a system of linear equations, and solve the system.