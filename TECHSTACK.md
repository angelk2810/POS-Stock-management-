# Tech Stack: ElectraStock Pro - Advanced Inventory & POS

This project is a modern web application built for stock management and point-of-sale operations. Below is a detailed breakdown of the technologies, frameworks, and libraries used to build this application.

## Core Architecture
- **Frontend Framework**: [React 19](https://react.dev/) - A JavaScript library for building user interfaces.
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Adds static typing to JavaScript for better developer experience and code quality.
- **Build Tool**: [Vite 6](https://vitejs.dev/) - A fast, modern build tool and development server.

## Styling & UI
- **Styling**: Plain CSS (`index.css`) - Vanilla CSS used for styling the application, prioritizing flexibility and custom design systems.
- **Icons**: [Lucide React](https://lucide.dev/) (`lucide-react`) - A collection of beautiful, consistent, and customizable SVG icons.
- **Animations**: [Motion](https://motion.dev/) (`motion`) - A modern animation library used for smooth UI transitions and micro-animations to enhance user experience.

## Data Visualization & Management
- **Charts**: [Recharts](https://recharts.org/) (`recharts`) - A composable charting library built on React components, used for displaying inventory and sales analytics.
- **Spreadsheet/Data Export**: [SheetJS](https://sheetjs.com/) (`xlsx`) - Used for reading and writing Excel spreadsheets, likely for bulk importing/exporting stock and sales data.

## AI Integration
- **Artificial Intelligence**: [Google GenAI API](https://ai.google.dev/) (`@google/genai`) - Integrated for intelligent features (e.g., smart product categorization, analytics insights, or chat assistance) via the `geminiService.ts`.

## Environment & Tooling
- **Node Environment**: Configured with `@types/node` for server-side types.
- **TypeScript Configuration**: Managed via `tsconfig.json`.
