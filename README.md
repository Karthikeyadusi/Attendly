# Attendly: Your Smart College Attendance Tracker

Attendly is a modern, AI-powered web application designed to help college students effortlessly track their class attendance, manage their schedule, and stay on top of their academic requirements. Built with a focus on a seamless mobile-first experience, it leverages AI to simplify setup and provides clear, actionable insights into attendance data.

## ✨ Core Features

- **Dashboard**: An at-a-glance overview of your day, showing today's classes and key attendance statistics.
- **AI-Powered Timetable Import**: Simply upload a picture of your timetable, and our AI will analyze it, extract your schedule, and set it up for you automatically.
- **Manual Schedule Management**: Easily add, edit, and delete subjects and individual class slots in your weekly timetable.
- **Intuitive Attendance Logging**: Log attendance for each class with a single tap using clear, color-coded statuses (✅ Attended, ❌ Absent, 🚫 Cancelled).
- **Swipeable Timetable UI**: A beautiful, mobile-first card stack layout lets you swipe through your weekly schedule, with today's date automatically highlighted.
- **Insightful Statistics**: Track your overall attendance percentage for each subject and see how many classes you can "safely" miss based on your college's requirements.
- **Client-Side Storage**: All your data is stored securely in your browser's `localStorage`, making the app fast, responsive, and available offline.
- **Dark/Light Mode**: A theme toggle to switch between dark and light modes for comfortable viewing.

## 🚀 Technical Stack & Architecture

Attendly is built with a modern, robust, and scalable tech stack.

- **Framework**: **Next.js 15** (with App Router) for a high-performance React application with server-side rendering capabilities.
- **Language**: **TypeScript** for type safety and improved developer experience.
- **Styling**: **Tailwind CSS** for utility-first styling, combined with **ShadCN UI** for a set of beautifully designed, accessible, and customizable components.
- **Generative AI**: **Google Genkit** serves as the backend-for-frontend to orchestrate AI flows, using the **Gemini 2.0 Flash** model for its powerful vision and reasoning capabilities.
- **State Management**: **React Hooks** (`useState`, `useEffect`, `useContext`) provide simple and effective local and global state management. The core logic is centralized in the `useAppData` custom hook.
- **Data Persistence**: **`localStorage`** is used for all client-side data storage, ensuring the app is fast and works offline. There is no traditional backend database required.
- **Icons**: **Lucide React** for a comprehensive and consistent set of icons.

### Project Structure

The project follows a standard Next.js App Router structure, organized for clarity and maintainability.

```
/src
├── ai/
│   ├── flows/
│   │   └── extract-timetable-flow.ts  # Genkit flow for AI timetable parsing
│   └── genkit.ts                      # Genkit configuration
├── app/
│   ├── (main)/                        # Main authenticated app routes
│   │   ├── dashboard/
│   │   ├── subjects/
│   │   └── timetable/
│   ├── globals.css                    # Global styles & Tailwind CSS
│   └── layout.tsx                     # Root application layout
├── components/
│   ├── ui/                            # ShadCN UI components
│   ├── attendance/                    # Components for attendance tracking
│   ├── layout/                        # Header, BottomNav, etc.
│   ├── subjects/                      # Components for subject management
│   └── timetable/                     # Components for the timetable view
├── hooks/
│   ├── useAppData.ts                  # Core hook for all app logic and data
│   └── use-toast.ts                   # Custom hook for toast notifications
├── types/
│   └── index.ts                       # TypeScript type definitions
└── lib/
    └── utils.ts                       # Utility functions (e.g., cn for classnames)
```

## 🧠 How It Works: A Deep Dive

### Data Management with `useAppData`

The entire application state (subjects, timetable, attendance) is managed through the `useAppData` custom hook (`src/hooks/useAppData.ts`). This hook acts as a single source of truth.

1.  **Initialization**: On app load, it reads data from `localStorage`. If no data exists, it starts with a clean initial state.
2.  **State Updates**: All actions (adding a subject, logging attendance, etc.) are functions within this hook. They update the state object.
3.  **Persistence**: A `useEffect` hook listens for any changes to the state. Whenever the data changes, it's automatically saved back to `localStorage`.
4.  **Context Provider**: The state and action functions are provided to the entire component tree via `AppProvider`, making the data globally accessible without prop drilling.

### The AI Timetable Import Flow

This is the most complex and powerful feature of Attendly.

1.  **User Interaction (`TimetableImportDialog.tsx`)**:
    - The user clicks "Import with AI" and selects an image file.
    - The image is converted into a **Base64 Data URI**. This is a string representation of the image that can be easily sent as part of a JSON payload to the AI.

2.  **AI Invocation (`extract-timetable-flow.ts`)**:
    - The Data URI is passed to the `extractTimetable` Genkit flow.
    - This flow is defined with a Zod schema for its input (`photoDataUri`) and output (`slots`).
    - It contains a detailed **prompt** that instructs the Gemini model on its task. The prompt is crucial and tells the AI:
        - It is an intelligent timetable parser.
        - To identify the subject, day, start time, and end time.
        - The expected output format (JSON).
        - **Critical Inference Logic**: "To determine the end time, you must look ahead to the next scheduled class on the SAME DAY. The end time for one class is the start time of the next class... If a class is the last one of the day, assume a standard duration of 50 minutes." This allows the AI to correctly parse timetables where end times aren't explicitly written.
    - The `{{media url=photoDataUri}}` Handlebars syntax in the prompt tells Genkit to embed the image for the model to "see".

3.  **Processing and Confirmation**:
    - The AI model returns a structured JSON object containing an array of extracted class slots.
    - The `TimetableImportDialog` component receives this data and displays it in a preview list, allowing the user to review and edit any details.

4.  **Saving the Data (`useAppData.ts`)**:
    - When the user clicks "Save," the extracted slots are passed to the `importTimetable` function in `useAppData`.
    - This function intelligently merges the data:
        - It checks if the subjects already exist. If not, it creates them.
        - It iterates through the slots and adds them to the existing timetable, checking for duplicates.
    - The new state is saved to `localStorage`, and the UI updates instantly.

## Getting Started

To run this project locally, follow these steps:

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables**
    - Create a `.env` file in the root of the project.
    - Add your Google Gemini API key to this file. You can get one from [Google AI Studio](https://aistudio.google.com/).
      ```
      GOOGLE_API_KEY=__YOUR_API_KEY__
      ```

4.  **Run the Development Server**
    The Next.js app and the Genkit AI flows run on different ports.

    - **Start the Next.js App:**
      ```bash
      npm run dev
      ```
      The application will be available at `http://localhost:9002`.

    - **Start the Genkit Dev Server (Optional):**
      To inspect the AI flows and view logs, you can run the Genkit UI in a separate terminal.
      ```bash
      npm run genkit:dev
      ```
      The Genkit UI will be available at `http://localhost:4000`.

Now you can open your browser and start using Attendly!
