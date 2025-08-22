# **Proyecto "Pulso Argentino": Documentación General**
**Versión:** 1.0 

## Resumen Ejecutivo

"Pulso Argentino" es una plataforma de inteligencia de decisión end-to-end, nativa en la nube (100% AWS), diseñada para transformar la volatilidad económica argentina en una ventaja competitiva. Su misión es proveer a los tomadores de decisiones un análisis robusto y un pronóstico probabilístico sobre la evolución del tipo de cambio oficial ARS/USD.

Tras un riguroso proceso de experimentación y validación, el proyecto culminó en el desarrollo de un pipeline de MLOps automatizado que entrena, evalúa y despliega un modelo de **Red Neuronal Recurrente (LSTM)**. Este modelo es capaz de predecir la **trayectoria del rango de precios (intervalo de confianza) del dólar en un horizonte de 5 días**.

La arquitectura del modelo, basada en **Transfer Learning de dos etapas y Conmutación de Régimen**, fue diseñada explícitamente para manejar la ruptura estructural de diciembre de 2023 y la consecuente escasez de datos en el nuevo entorno de alta volatilidad. El sistema opera bajo un ciclo de **re-entrenamiento diario**, asegurando que la predicción para el día siguiente (h+1) utilice siempre la información más reciente para máxima precisión.

## Justificación Estratégica del Horizonte Temporal

La decisión de utilizar datos históricos a partir del **1 de enero de 2019** se basa en dos pilares fundamentales:

* **Justificación Técnica:** Este punto de partida proporciona más de cinco años de datos diarios, resultando en más de 1,000 puntos de datos por serie. Este volumen es suficiente para que los algoritmos de Machine Learning identifiquen patrones fiables sin incurrir en los costos y la complejidad de procesar décadas de información irrelevante.

* **Justificación Económica:** La economía argentina sufre de frecuentes "quiebres estructurales". El período desde 2019 encapsula un capítulo económico coherente y relevante (pandemia, renegociación de deuda, aceleración inflacionaria, cambio de gobierno), forzando al modelo a aprender del "ADN" de la economía moderna. Usar datos más antiguos podría "contaminar" al modelo con patrones que ya no son aplicables.

## Arquitectura de la Solución (100% AWS)

El sistema está construido enteramente sobre servicios gestionados de AWS para garantizar escalabilidad, seguridad y reproducibilidad.

* **Cómputo:**
    * **EC2 (Bastión de Ingesta):** Una instancia dedicada a la ejecución de los pipelines de extracción, transformación y carga (ETL) desde las APIs públicas (BCRA) y de **argentinadatos.com(riesgo pais)** hacia el Data Warehouse.
    * **EC2 (Bastión de ML):** Una instancia (`m5.large`) que alberga todo el ciclo de vida del modelo, desde el preprocesamiento hasta el entrenamiento, la evaluación y la generación de la predicción final.

* **Almacenamiento de Artefactos:** **Amazon S3** es el repositorio central para todos los datos y artefactos del proyecto, organizado por prefijos para aislar cada etapa (`raw/`, `processed_anchor_delta_h5/`, `production_models/`, `production_evaluation/`).

* **Base de Datos Analítica:** **Amazon RDS para PostgreSQL** funciona como el Data Warehouse (`pulso_argentino_dw`), almacenando los datos históricos y diarios extraídos de las fuentes.

* **Entorno de Ejecución:** Una **Instancia EC2** para el entorno de ejecución del modelo (TensorFlow, Scikit-learn, etc.). 

* **Observabilidad:** Todas las ejecuciones de los scripts generan logs estructurados que son enviados a **Amazon CloudWatch**, permitiendo un monitoreo centralizado, la depuración y la creación de alertas.

## Pipeline de Datos: De la API al Modelo

El flujo de datos está diseñado para ser automático, resiliente e idempotente.

#### Extracción y Carga Inicial (Backfill)
Es un proceso que se ejecuta una única vez para poblar el Data Warehouse con el histórico de datos desde el 1 de enero de 2019. El script de ETL consulta sistemáticamente los endpoints de las APIs de estadísticas monetarias y cambiarias del BCRA para las variables requeridas (Dólar Oficial, Reservas, Base Monetaria).

#### Ingesta Diaria Automatizada
Un script orquestador, gestionado por **cron**, se ejecuta varias veces al día (9 AM, 1 PM, 5 PM, 10 PM ART) para capturar los datos del día tan pronto como sean publicados.
* **Lógica de Sondeo (Polling):** El script intenta activamente obtener los datos en diferentes momentos del día.
* **Lógica Idempotente:** Antes de consultar la API, el script verifica si el dato para la fecha actual ya existe en la base de datos de RDS. Si ya existe, la ejecución termina para evitar duplicados. Si no existe y la API tiene el dato, lo inserta.

#### Generación del Dataset Unificado
Un script (`extract_to_s3.py`) consulta el Data Warehouse en RDS, une las tablas de datos, aplica un `forward-fill` para rellenar fines de semana y feriados, y guarda el resultado como un único archivo `dataset_macro.parquet` en S3. Este archivo es la **"única fuente de verdad"** para todo el pipeline de Machine Learning.

## Pipeline de MLOps: El Ciclo de Vida del Modelo

El corazón del proyecto es un pipeline automatizado que gestiona el ciclo de vida completo del modelo, diseñado para ser re-ejecutado diariamente.

#### Preprocesamiento (`preprocess_anchor_delta.py`)
Este script toma el dataset unificado y lo transforma para el modelo de trayectoria:
1.  **Ingeniería de Características:** Crea variables adicionales como la volatilidad a 15 días y flags para eventos políticos.
2.  **Creación del Target:** Genera el **vector objetivo de trayectoria (H=5)**, que consiste en el cambio porcentual (delta) desde el precio de anclaje (T-1) para cada uno de los siguientes 5 días.
3.  **División Estratificada:** Aplica una **División Temporal Estratificada por Régimen** para garantizar que los conjuntos de entrenamiento, validación y test contengan muestras representativas de ambos regímenes (estable y volátil).
4.  **Escalado:** Aplica `StandardScaler` y `RobustScaler` de forma independiente a las secuencias, anclas y targets, ajustándolos únicamente con los datos de entrenamiento.

#### Entrenamiento (`production_trajectory_trainer.py`)
Orquesta la **estrategia de Transfer Learning de dos etapas**:
* **Etapa 1 (Pre-entrenamiento):** Entrena el Encoder LSTM y el cabezal del régimen estable usando únicamente los datos de baja volatilidad, creando una base de conocimiento robusta.
* **Etapa 2 (Fine-Tuning):** Congela el Encoder y entrena únicamente el cabezal del régimen volátil con los pocos datos de alta volatilidad, especializándolo sin corromper la base.

#### Evaluación y Calibración (`production_evaluator.py`)
Toma el modelo entrenado y realiza una evaluación final rigurosa:
1.  **Comparación con Benchmark:** Mide el rendimiento del modelo (RMSE, MAE, sMAPE) contra el benchmark de persistencia para validar su valor agregado.
2.  **Calibración Conforme:** Aplica Conformal Prediction, usando el conjunto de validación para calcular un factor de corrección que ajusta el ancho de los intervalos de la trayectoria para mejorar la fiabilidad de la cobertura.

#### Inferencia (`generate_prediction.py`)
Es el script de producción final. Carga el último modelo validado, toma los datos más recientes disponibles, y genera un archivo **JSON con la predicción de trayectoria de 5 días**, listo para ser consumido.

#### Re-entrenamiento Diario
El pipeline completo, desde el preprocesamiento hasta el entrenamiento, está diseñado para ser ejecutado diariamente. Este ciclo constante asegura que el modelo se reajuste con la última información disponible, manteniendo la máxima precisión posible en su predicción más crítica: la del día siguiente (h+1).

## Arquitectura del Modelo Final

El modelo final es una red neuronal recurrente diseñada para el problema específico de predicción de trayectoria con ruptura estructural.

* **Entradas:**
    1.  **Secuencia:** 60 días de cambios diarios de las variables macroeconómicas.
    2.  **Ancla:** El precio absoluto del dólar al final de la secuencia (T-1).
    3.  **Flag de Régimen:** Un flag binario (0 o 1) que indica a qué régimen económico pertenece la secuencia.
* **Cuerpo (Encoder):** Múltiples capas **LSTM** seguidas de un **Mecanismo de Atención** para procesar la secuencia y extraer un vector de contexto que resume la historia relevante.
* **Cabezales (Heads):** Dos redes neuronales densas (MLPs) independientes y especializadas, una para el régimen estable y otra para el volátil.
* **Salida:** Cada cabezal produce un **vector de 10 valores** que definen la trayectoria de intervalos de confianza para los próximos 5 días: 5 valores para los límites inferiores y 5 para los anchos de los intervalos. La activación `softplus` garantiza que los anchos sean siempre no negativos.
* **Función de Pérdida:** El modelo se optimiza usando el **Winkler Score generalizado**, que promedia la pérdida de precisión y cobertura a lo largo de todo el horizonte de 5 días.


# Anexo: Arquitectura de Automatización del Pipeline de MLOps

Este documento detalla la implementación de un flujo de trabajo automatizado y sin servidor (serverless) que orquesta el ciclo de vida completo del modelo de Machine Learning, desde la ingesta de datos hasta la generación de la predicción final.

## **Arquitectura Basada en Eventos**

Para optimizar costos y garantizar una ejecución robusta, el sistema se basa en una arquitectura reactiva y orientada a eventos, utilizando los siguientes servicios de AWS:

* **Amazon S3:** Actúa como el repositorio central de datos y el disparador de todo el pipeline.
* **AWS Lambda:** Funciona como el orquestador ligero y sin servidor que inicia el proceso de cómputo.
* **Amazon EC2:** Proporciona el poder de cómputo bajo demanda para ejecutar el pipeline de MLOps.

El ciclo completo se ejecuta sin intervención manual, asegurando que el modelo se reentrene y genere una nueva predicción tan pronto como los datos actualizados estén disponibles.

## **Flujo de Trabajo del Pipeline Automatizado**

El proceso se desarrolla en una secuencia de cuatro pasos automatizados:

### **1. Ingesta y Disparo (Trigger)**
Un **cronjob** en una instancia de ingesta ejecuta un script de ETL que unifica los datos del día y sube el archivo `.parquet` actualizado a una ruta específica en S3 (ej. `s3://[bucket]/raw/`). La llegada de este objeto a S3 genera un evento `s3:ObjectCreated:Put` que actúa como la señal de inicio para todo el flujo de trabajo.

### **2. Orquestación (AWS Lambda)**
Una función **AWS Lambda** está suscrita al evento de creación de objetos en el bucket de S3. Al ser activada, la función ejecuta una única tarea: enviar un comando para **iniciar la instancia EC2 "Bastión de ML"**.

### **3. Ejecución y Reporte (Amazon EC2)**
La instancia EC2 está configurada con un script `user-data` que se ejecuta automáticamente al arrancar. Este script sigue un patrón de "Orquestador/Ejecutor" para garantizar una ejecución segura y robusta:
* **El Orquestador (`root`):** El script principal se ejecuta como `root` y su única responsabilidad es delegar la ejecución del pipeline al usuario de la aplicación.
* **El Ejecutor (`ec2-user`):** Un script secundario se ejecuta con los privilegios del usuario `ec2-user`, asegurando que se utilice el entorno de Python y los permisos de archivo correctos. Este script ejecuta la secuencia completa de tareas: preprocesamiento, entrenamiento, evaluación y predicción.
* **Reporte de Estado:** Al finalizar, el script Ejecutor genera un **reporte de estado en formato JSON** que detalla el éxito o fallo de cada etapa, y lo deja en una ubicación temporal.

### **4. Limpieza y Auto-Apagado (Self-Termination)**
Una vez que el script Ejecutor termina, el Orquestador (`root`) retoma el control. Su tarea final es:
* Recoger el reporte JSON de estado.
* Subir dicho reporte a una carpeta designada en S3 para observabilidad.
* Emitir el **comando final para apagar la propia instancia EC2**, asegurando que los recursos de cómputo solo se utilicen durante el tiempo estrictamente necesario.

## Resumen

El proyecto "Pulso Argentino" ha culminado con éxito en la creación de un sistema de MLOps de punta a punta. Se ha demostrado matemáticamente y validado empíricamente que, si bien la predicción a 1 día es dominada por la inercia del mercado, un modelo sofisticado de Transfer Learning **puede superar al benchmark de persistencia en un horizonte estratégico de 5 días**. El principal logro es una "máquina de la verdad" capaz de validar hipótesis, cuantificar la incertidumbre y producir pronósticos probabilísticos que sirven como una herramienta robusta para la toma de decisiones estratégicas en el volátil contexto económico argentino.