# **Documento de Construcción y Especificación Técnica: Dashboard "Pulso Argentino"**

**Propósito:** Este documento sirve como el plano de construcción y la especificación técnica definitiva para la interfaz de usuario (front-end) del proyecto "Pulso Argentino". Contiene todas las definiciones arquitectónicas, funcionales y de diseño requeridas para su implementación.

## 1. Visión General y Principios de Diseño

### 1.1. Misión
La interfaz de usuario debe servir como la manifestación visual de la complejidad y el rigor del modelo predictivo subyacente. Su propósito es traducir un producto de datos complejo (una trayectoria probabilística) en una visión clara, intuitiva y accionable para la toma de decisiones estratégicas.

### 1.2. Filosofía de Diseño: "Claridad Algorítmica"
El diseño se fundamenta en un minimalismo enfocado que enaltece los datos. La interfaz no es un contenedor, sino una lente que enfoca la atención del usuario en el único elemento que importa: la tensión entre el pasado conocido y el futuro incierto.

* **Estética:** La interfaz será de modo oscuro, utilizando una paleta de colores restringida para eliminar el ruido visual. El layout será espacioso, con un uso deliberado del espacio negativo para crear enfoque y calma.
* **Jerarquía:** El gráfico de la trayectoria es el héroe indiscutible de la interfaz. Todos los demás elementos son secundarios y deben servir para darle soporte y contexto, sin competir por la atención.
* **Interactividad:** Las interacciones deben ser fluidas, sutiles y significativas, diseñadas para revelar información adicional bajo demanda sin abrumar al usuario.

## 2. Especificaciones del Stack Tecnológico

La selección del stack está orientada a la excelencia visual, el rendimiento y la integración nativa con la infraestructura AWS existente.

* **Framework de UI:** **React v18+**.
    * **Justificación:** Ecosistema maduro, rendimiento robusto con el DOM virtual y una integración perfecta con la plataforma de despliegue. Se utilizarán hooks funcionales exclusivamente (`useState`, `useEffect`, `useCallback`).
* **Lenguaje:** **TypeScript**.
    * **Justificación:** Impone un contrato de datos estricto en toda la aplicación, eliminando una clase entera de errores en tiempo de ejecución y garantizando la mantenibilidad del código.
* **Librería de Gráficos:** **Apache ECharts**.
    * **Justificación:** Su potente motor de renderizado y su API de configuración granular son indispensables para lograr el nivel de personalización visual y de interacción (gradientes, animaciones, tooltips personalizados) que este proyecto exige.
* **Estilizado:** **Tailwind CSS**.
    * **Justificación:** Proporciona un sistema de diseño utility-first que permite construir interfaces complejas y consistentes directamente en el marcado, acelerando el desarrollo y garantizando la adherencia a los tokens de diseño.
* **Peticiones HTTP:** **Axios**.
    * **Justificación:** Un cliente HTTP robusto y estándar en la industria para la comunicación con los endpoints de datos en S3.
* **Animación de UI:** **Framer Motion**.
    * **Justificación:** Para las transiciones y animaciones de la interfaz (ej. la carga inicial del dashboard), proporciona una API declarativa y potente que se integra limpiamente con React.
* **Despliegue y Hosting:** **AWS Amplify**.
    * **Justificación:** Proporciona un flujo de CI/CD completamente gestionado desde el repositorio de código, hosting en una CDN global y una gestión simplificada de variables de entorno.

## 3. Estructura y Configuración del Proyecto

#### 3.1. Estructura de Directorios
El proyecto se inicializará con `create-react-app --template typescript` y se organizará con la siguiente estructura dentro de `/src`:

/src
|-- /assets          # Fuentes (Inter), SVGs, patrones de fondo
|-- /components      # Componentes de React reutilizables (Header, Footer, Chart)
|-- /hooks           # Hooks personalizados (ej. useChartOptions)
|-- /services        # Lógica de fetching de datos (dataService)
|-- /types           # Definiciones de tipos de TypeScript (prediction)
|-- /utils           # Funciones de utilidad (ej. formateo de fechas con date-fns)
|-- App.tsx          # Componente raíz y orquestador de la página
|-- index.css        # Configuración global y directivas de Tailwind
|-- index.tsx        # Punto de entrada de la aplicación

#### 3.2. Sistema de Diseño (Design Tokens)
El archivo `tailwind.config.js` será el único lugar donde se definan los tokens de diseño para garantizar la consistencia visual.

* **Paleta de Colores:**
    * `base`: `#0D1117` (Fondo principal)
    * `surface`: `#161B22` (Fondo de elementos elevados como el tooltip)
    * `primary`: `#2F81F7` (Acento para la línea histórica y de predicción)
    * `secondary`: `#FF7F0E` (Acento para la banda de confianza, con gradiente)
    * `text-primary`: `#C9D1D9` (Texto principal)
    * `text-secondary`: `#8B949E` (Texto secundario y etiquetas de los ejes)
    * `danger`: `#F85149` (Puntos de realidad)
* **Tipografía:**
    * `fontFamily.sans`: `Inter`, `sans-serif`. Se debe importar la fuente Inter desde Google Fonts en `public/index.html`.

## 4. Arquitectura de Datos y Estado

#### 4.1. Contrato de Datos
El archivo `src/types/prediction.ts` definirá las interfaces para los datos consumidos, sirviendo como un contrato estricto.

* **`TrajectoryPoint`**: `{ date: string, forecast_day: number, lower_bound: number, upper_bound: number }`
* **`PredictionData`**: `{ prediction_generated_on: string, anchor_price: number, trajectory: TrajectoryPoint[] }`
* **`HistoricalDataPoint`**: `{ date: string, value: number }`

#### 4.2. Servicio de Datos
El módulo `src/services/dataService.ts` abstraerá el origen de los datos.
* **Funciones:** Exportará dos funciones asíncronas: `fetchPredictionData(): Promise<PredictionData>` y `fetchHistoricalData(): Promise<HistoricalDataPoint[]>`.
* **URLs:** Las URLs de los archivos JSON en S3 no estarán hardcodeadas. Se accederán a través de variables de entorno de React (`process.env.REACT_APP_PREDICTION_DATA_URL`).
* **Cache Busting:** Todas las peticiones `GET` añadirán un parámetro de consulta con el timestamp actual (`?t=${new Date().getTime()}`) para evitar que la CDN sirva una versión en caché de los datos.

#### 4.3. Gestión de Estado
El estado será local y gestionado en el componente `App.tsx` mediante hooks de React. No se introducirá un gestor de estado global para mantener la simplicidad.
* **Variables de Estado:**
    * `prediction: PredictionData | null`
    * `historical: HistoricalDataPoint[]`
    * `loading: boolean`
    * `error: string | null`
* **Lógica:** Un único `useEffect` orquestará la llamada a las dos funciones del servicio de datos a través de `Promise.all` para una carga paralela y eficiente.

## 5. Arquitectura de Componentes

#### 5.1. `Header.tsx`
* **Responsabilidad:** Mostrar el título del proyecto y la fecha de la última predicción.
* **Props:** `{ lastUpdated: string }`
* **Contenido:** Un título `<h1>` "Pulso Argentino" y un subtítulo `<p>` "Pronóstico generado el: {lastUpdated}".

#### 5.2. `ChartComponent.tsx`
* **Responsabilidad:** Encapsular toda la lógica de configuración y renderizado del gráfico de ECharts.
* **Props:** `{ predictionData: PredictionData, historicalData: HistoricalDataPoint[], isLoading: boolean }`
* **Lógica Interna:**
    * **Preparación de Series:** Contendrá funciones para transformar los datos de las props en las 4 series que ECharts necesita, con las siguientes especificaciones:
        1.  **Serie Histórica:** `type: 'line'`, `color: colors.primary`, `showSymbol: false`, `smooth: true`.
        2.  **Banda de Confianza:** Se implementará con dos series `line` apiladas. La serie superior tendrá un `areaStyle` con un `color` definido por un gradiente lineal de ECharts, desde `colors.secondary` (con baja opacidad) a transparente. Ambas líneas tendrán `lineStyle: { opacity: 0 }` para que solo el área sea visible.
        3.  **Trayectoria Central:** `type: 'line'`, `color: colors.primary`, `lineStyle: { type: 'dashed' }`.
        4.  **Puntos de Realidad:** `type: 'scatter'`, `color: colors.danger`, `symbolSize: 8`, con una animación de entrada (`emphasis` y `blur`).
    * **Configuración de ECharts (`option`):** El objeto de opciones será exhaustivo para lograr la estética deseada:
        * **Animación:** La animación de carga inicial será habilitada (`animation: true`).
        * **Tooltip:** Se configurará con un `trigger: 'axis'`, un `backgroundColor: colors.surface` y un `formatter` personalizado para mostrar los datos de todas las series de forma clara y alineada.
        * **Ejes:** Los ejes X e Y tendrán las líneas y etiquetas de color `text-secondary`. El eje Y tendrá `splitLine` con estilo `dashed` y baja opacidad.
        * **DataZoom:** Se habilitará un `dataZoom` de tipo `inside` para permitir zoom y pan intuitivos con la rueda del ratón.

#### 5.3. `Footer.tsx`
* **Responsabilidad:** Mostrar información contextual y de autoría.
* **Props:** Ninguna.
* **Contenido:** Texto simple con `text-secondary` indicando "Modelo: LSTM con Transfer Learning. Horizonte: 5 días."

## 6. Flujo de Despliegue en AWS Amplify

El despliegue será un proceso automatizado de CI/CD.
1.  **Conexión:** Se conectará el repositorio de código a una nueva App en la consola de AWS Amplify.
2.  **Configuración de Build:** Se utilizará la configuración estándar de Amplify para aplicaciones `create-react-app`, verificando que el `baseDirectory` del artefacto sea `build`.
3.  **Variables de Entorno:** Se configurarán en la UI de Amplify las variables `REACT_APP_PREDICTION_DATA_URL` y `REACT_APP_HISTORICAL_DATA_URL` con las URLs públicas de los archivos JSON correspondientes en S3.
4.  **Despliegue:** Al hacer `push` a la rama principal, Amplify automáticamente clonará, instalará dependencias (`npm ci`), construirá el proyecto (`npm run build`) y lo desplegará en su CDN global.