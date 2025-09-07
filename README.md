
<!-- Test change to verify deployment. -->
# Attendly: Your Smart College Attendance Tracker

Attendly is a modern, AI-powered web application designed to help college students effortlessly track their class attendance, manage their schedule, and stay on top of their academic requirements. Built with a focus on a seamless mobile-first experience, it leverages AI to simplify setup and provides clear, actionable insights into attendance data.

## 💡 Our Collaborative Journey

This project has been a dynamic and iterative collaboration. Our workflow is a tight loop of ideation, implementation, and refinement: the project lead identifies a new feature or a critical bug, and the AI coding partner translates that vision into concrete code changes across the Next.js and Genkit stack. Together, we've implemented the "Weekly Debrief," a motivational, AI-powered summary that cleverly uses the empty dashboard space on Sundays to provide users with personalized feedback. More importantly, we've diligently hunted down and squashed several complex bugs, from critical React rendering errors caused by misplaced state updates to subtle timezone-related issues that incorrectly marked days as holidays. We also enhanced the user experience by adding crucial features like the ability to undo logged attendance and a fail-safe mechanism to delete accidentally duplicated postponed classes, making the app not just more powerful, but significantly more reliable and user-friendly.

## ✨ Core Features

- **Dashboard**: An at-a-glance overview of your day, showing today's classes and key attendance statistics.
- **AI-Powered Timetable Import**: Simply upload a picture of your timetable, and our AI will analyze it, extract your schedule, and set it up for you automatically.
- **AI Weekly Debrief**: Every Sunday, receive a personalized, AI-generated summary of your weekly attendance with a motivational message to keep you on track.
- **Manual Schedule Management**: Easily add, edit, and delete subjects and individual class slots in your weekly timetable.
- **Intuitive Attendance Logging**: Log attendance for each class with a single tap using clear, color-coded statuses (✅ Attended, ❌ Absent, 🚫 Cancelled), and easily undo any mistakes.
- **Class Rescheduling**: Postpone a class to a different day, which creates a one-off entry in your schedule and can be deleted if needed.
- **Swipeable Timetable UI**: A beautiful, mobile-first card stack layout lets you swipe through your weekly schedule, with today's date automatically highlighted.
- **Insightful Statistics**: Track your overall attendance percentage for each subject and see how many classes you can "safely" miss based on your college's requirements.
- **Client-Side Storage**: All your data is stored securely in your browser's `localStorage`, making the app fast, responsive, and available offline.
- **Dark/Light Mode**: A theme toggle to switch between dark and light modes for comfortable viewing.

## 🚀 Technical Stack & Architecture

Attendly is built with a modern, robust, and scalable tech stack.

- **UI Library**: **React 18**. The core of our application is built using React, leveraging functional components and hooks for a declarative and efficient user interface.
- **Framework**: **Next.js 15**. Built on top of React, Next.js provides the structure for our application, including the App Router, Server Components, and a seamless development experience.
- **Language**: **TypeScript**. We use TypeScript across the entire project for robust type safety, better autocompletion, and improved code quality.
- **Generative AI**: **Google Genkit** serves as our backend-for-frontend, orchestrating powerful AI flows that use the **Gemini 2.0 Flash** model for vision and reasoning tasks.
- **Styling**: **Tailwind CSS** is used for its utility-first styling approach, combined with **ShadCN UI** for our library of beautifully designed, accessible, and customizable components.
- **Data & State Management**: State is managed with **React Hooks** and the Context API, centralized in our `useAppData` hook. For persistence, we use **`localStorage`** for an offline-first approach and **Firebase (Firestore)** for optional cloud backup and sync.
- **Icons**: **Lucide React** provides a comprehensive and consistent set of icons.

### Project Structure

The project follows a standard Next.js App Router structure, organized for clarity and maintainability.

```
/src
├── ai/
│   ├── flows/
│   │   ├── extract-timetable-flow.ts  # Genkit flow for AI timetable parsing
│   │   └── weekly-debrief-flow.ts     # Genkit flow for the weekly summary
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
        - **Critical Inference Logic**: A client-side processing function (`processRawSlots`) intelligently calculates end times by looking ahead to the next class and handling special cases like lunch breaks, ensuring a robust and accurate schedule is generated even from incomplete timetable images.
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

Now you can open your browser and start using our Attendly!
