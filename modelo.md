# **Documentación Técnica: Modelo de Predicción de Trayectoria ARS/USD**
**Versión:** 1.0
**Fecha:** 2025-08-19

## Resumen Ejecutivo

Este documento detalla la arquitectura técnica y el fundamento matemático del modelo final para el proyecto "Pulso Argentino". El objetivo es la predicción de la trayectoria probabilística del tipo de cambio ARS/USD en un horizonte de $H=5$ días.

La solución consiste en un modelo de **Red Neuronal Recurrente (LSTM) con un mecanismo de Atención**, diseñado bajo una arquitectura de **Conmutación de Régimen Explícita**. El entrenamiento se realiza mediante una estrategia de **Transfer Learning en dos etapas**, una solución rigurosa para manejar la ruptura estructural presente en la serie y la escasez de datos en el régimen de alta volatilidad post-ruptura.

El modelo no produce una predicción puntual, sino que modela la **distribución predictiva de la trayectoria futura**, entregando un "cono de incertidumbre" que cuantifica el riesgo a lo largo del horizonte. La optimización se realiza mediante una función de pérdida **Winkler Score generalizada**, diseñada para equilibrar la precisión y la cobertura del intervalo de confianza a lo largo de toda la trayectoria. Todo el ciclo de vida del modelo está encapsulado en un pipeline de MLOps robusto y reproducible.

---

## Formulación Matemática del Problema

Sea el tipo de cambio $Y_t \in \mathbb{R}^+$ un proceso estocástico observado en tiempos discretos $t \in \mathbb{Z}$. Sea $X_t \in \mathbb{R}^k$ un vector de $k$ variables económicas exógenas. La información disponible en el tiempo $t$ está contenida en la σ-álgebra $\mathcal{F}_t = \sigma(\{Y_s, X_s\}_{s \le t})$.

Se sabe que existe un tiempo $T_c$ que marca una **ruptura estructural**, tal que las propiedades estadísticas del proceso para $t < T_c$ (Régimen Estable, $\mathcal{R}_S$) son significativamente diferentes de las de $t \ge T_c$ (Régimen Volátil, $\mathcal{R}_V$).

El objetivo del modelo $M$ no es predecir un valor escalar, sino modelar la **distribución predictiva posterior** para el **vector de trayectoria futura** $\mathbf{Y}_{t+1:t+H} = (Y_{t+1}, Y_{t+2}, ..., Y_{t+H})$, donde el horizonte $H=5$. Formalmente:

$$
M: \mathcal{F}_t \rightarrow P(\mathbf{Y}_{t+1:t+H} | \mathcal{F}_t)
$$

El resultado final del modelo es un conjunto de intervalos de confianza $[L_{t+h}, U_{t+h}]$ para cada día $h \in \{1, ..., H\}$ del horizonte, que deben satisfacer simultáneamente criterios de cobertura estadística, precisión (ancho del intervalo) y dominancia sobre un benchmark de persistencia.

---

## Arquitectura del Modelo: LSTM con Conmutación de Régimen

La arquitectura está diseñada explícitamente para manejar la dualidad de regímenes del problema. Se compone de un extractor de características universal y dos cabezales de predicción especializados.

### Componente 1: El Encoder Recurrente Compartido

El núcleo del modelo es un **Encoder** compuesto por múltiples capas de **Long Short-Term Memory (LSTM)**, seguido de un **Mecanismo de Atención**.
* **Capas LSTM:** Procesan la secuencia de entrada (cambios diarios de las variables) para capturar las dependencias temporales complejas y el "momentum" de la serie.
* **Mecanismo de Atención:** Tras las LSTMs, una capa de atención re-pondera la secuencia de salida de la LSTM, permitiendo al modelo enfocarse en los puntos del pasado más relevantes para la predicción futura. La salida es un único vector de contexto, $\mathbf{c}_t$, que resume la historia relevante.

### Componente 2: Los Cabezales de Predicción Especializados

El vector de contexto $\mathbf{c}_t$ y la entrada de anclaje (el precio $Y_{t-1}$) se fusionan y alimentan simultáneamente a dos cabezales de predicción (MLPs) paralelos e independientes:
* **`Head_Estable` ($M_S$):** Especializado en la dinámica del Régimen Estable.
* **`Head_Volatil` ($M_V$):** Especializado en la dinámica del Régimen Volátil.

Ambos cabezales comparten una arquitectura idéntica pero no comparten pesos, permitiendo un aprendizaje especializado.

### Componente 3: La Salida de Trayectoria Probabilística

Cada cabezal está diseñado para producir la trayectoria de intervalos completa. La salida no son los límites del intervalo directamente, sino sus componentes: el límite inferior y el ancho. Para cada horizonte $h \in \{1, ..., H\}$, el modelo predice:
* Un vector de límites inferiores: $\hat{\mathbf{L}} = (\hat{L}_{t+1}, ..., \hat{L}_{t+H})$
* Un vector de anchos brutos: $\hat{\mathbf{W}}_{raw} = (\hat{W}_{raw, t+1}, ..., \hat{W}_{raw, t+H})$

Para garantizar que el intervalo sea siempre matemáticamente válido (ancho no negativo), se aplica una activación `softplus`:

$$
\hat{\mathbf{W}} = \text{softplus}(\hat{\mathbf{W}}_{raw}) = \log(1 + e^{\hat{\mathbf{W}}_{raw}})
$$

El vector de límites superiores se construye aditivamente:

$$
\hat{\mathbf{U}} = \hat{\mathbf{L}} + \hat{\mathbf{W}}
$$

La salida final de cada cabezal es la concatenación de estos vectores, resultando en un vector de dimensión $2H$: $O = [\hat{\mathbf{L}}, \hat{\mathbf{U}}]$.

### Componente 4: El Mecanismo de Conmutación

Se introduce una entrada adicional al modelo, el **flag de régimen** $r_t \in \{0, 1\}$, donde $r_t=0$ para $\mathcal{R}_S$ y $r_t=1$ para $\mathcal{R}_V$. La salida final del modelo $O_{final}$ se selecciona mediante una combinación lineal controlada por este flag, asegurando que solo los gradientes del cabezal activo se propaguen durante el entrenamiento para una muestra dada:

$$
O_{final} = (1 - r_t) \cdot O_{estable} + r_t \cdot O_{volatil}
$$

---

## Arquitectura de Entrenamiento: Transfer Learning Explícito en Dos Etapas

Para abordar la escasez de datos en $\mathcal{R}_V$, se implementa un flujo de entrenamiento riguroso en dos etapas.

#### **Etapa 1: Pre-entrenamiento del Modelo Base**
* **Datos:** Se utiliza exclusivamente el conjunto de datos de entrenamiento perteneciente al Régimen Estable ($t < T_c$).
* **Objetivo:** Entrenar el modelo completo (Encoder + ambos cabezales, aunque solo el estable recibe gradientes) para que el **Encoder aprenda una representación rica y robusta** de la dinámica general de las series de tiempo con la abundancia de datos disponibles. El resultado es un Encoder con pesos optimizados, $W^*_{encoder}$.

#### **Etapa 2: Fine-Tuning del Especialista Volátil**
* **Datos:** Se utiliza exclusivamente el conjunto de datos de entrenamiento perteneciente al Régimen Volátil ($t \ge T_c$).
* **Proceso:**
    1.  Se cargan los pesos del modelo pre-entrenado en la Etapa 1.
    2.  Se **congelan todos los pesos del Encoder ($W^*_{encoder}$)** y del `Head_Estable`. Esto es el paso crucial del Transfer Learning.
    3.  El modelo se re-compila con una tasa de aprendizaje inferior (fine-tuning).
    4.  Se entrena el modelo. Los gradientes ahora fluyen **únicamente hacia los pesos del `Head_Volatil`**.
* **Objetivo:** El `Head_Volatil` aprende a reinterpretar las características ricas y estables extraídas por el Encoder congelado para la nueva dinámica de alta volatilidad, maximizando el valor de cada muestra de datos escasos.

---

## Función de Pérdida y Métricas

#### **Función de Pérdida: Winkler Score Generalizado para Trayectorias**
La optimización se realiza mediante una función de pérdida que promedia el **Winkler Score** a lo largo de todo el horizonte. Para una trayectoria real $\mathbf{Y}$ y una predicha $[\hat{\mathbf{L}}, \hat{\mathbf{U}}]$, la pérdida es:

$$
\mathcal{L}_{total} = \frac{1}{H} \sum_{h=1}^{H} \left[ (\hat{U}_{t+h} - \hat{L}_{t+h}) + \frac{2}{\alpha} \left( \max(0, \hat{L}_{t+h} - Y_{t+h}) + \max(0, Y_{t+h} - \hat{U}_{t+h}) \right) \right]
$$

Esta función entrena al modelo para producir una trayectoria de intervalos que sea colectivamente precisa (minimizando el ancho promedio) y fiable (maximizando la cobertura a lo largo del tiempo).

#### Métricas de Evaluación**
La evaluación del rendimiento de la predicción puntual se realiza calculando las métricas estándar (MAE, RMSE, sMAPE) sobre el punto medio del intervalo, promediadas a lo largo de todo el horizonte.

---

## Integración en el Flujo de MLOps

La implementación de esta arquitectura se orquesta mediante un conjunto de scripts especializados:
* **`preprocess_anchor_delta.py`:** Prepara los datos, aplicando la **División Temporal Estratificada por Régimen** para garantizar que los conjuntos de entrenamiento, validación y test contengan muestras de ambos regímenes. Genera el target como un vector de trayectoria de dimensión $2H$.
* **`production_trajectory_trainer.py`:** Orquesta el **flujo de entrenamiento de dos etapas**, manejando la filtración de datos para cada etapa, la congelación de capas y la re-compilación del modelo para el fine-tuning.
* **`production_evaluator.py`:** Carga el modelo final, aplica **Calibración Conforme** a la trayectoria completa para ajustar la cobertura, y genera los artefactos de evaluación, incluyendo la visualización del **MAE por día del horizonte**.
* **`generate_prediction.py`:** Constituye el pipeline de **inferencia de producción**, cargando el último modelo y los scalers para generar el pronóstico de trayectoria en formato JSON a partir de los datos más recientes.