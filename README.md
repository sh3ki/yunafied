
  # YUNAfied

  YUNAfied is a collaborative, web-based tutorial management system designed for YUNA. It centralizes tutorial scheduling, learning resource delivery, assignment workflows, communication, performance monitoring, and AI-assisted learning support in one platform for administrators, teachers, and students.

  ## Project Overview

  Educational institutions increasingly rely on digital systems to improve teaching, learning, and academic operations. However, tutorial activities are still often handled through fragmented tools and manual processes, which can cause schedule conflicts, delayed feedback, weak progress tracking, and inconsistent communication.

  YUNAfied addresses these issues by providing a unified system that supports:

  - Structured tutorial administration
  - Organized academic workflows
  - Real-time communication
  - Performance evaluation and reporting
  - AI-supported and gamified learning experiences

  ## Problem Statement

  Common tutorial management challenges include:

  - Scattered information across separate platforms
  - Manual handling of schedules, tasks, and records
  - Communication gaps between teachers and students
  - Difficulty tracking student progress consistently
  - High administrative overhead for educators

  These challenges reduce efficiency and can negatively affect learner engagement and support.

  ## Purpose

  The purpose of YUNAfied is to develop a centralized digital platform that improves tutorial management and academic coordination by integrating key educational functions into a single, accessible system.

  ## Objectives

  ### General Objective

  Design and develop YUNAfied as a collaborative tutorial management system that improves communication, academic monitoring, and tutorial operations through scheduling, assignment management, performance evaluation, and AI-assisted learning features.

  ### Specific Objectives

  1. Develop role-based modules for administrators, teachers, and students, including account and enrollment management, scheduling, assignment workflows, and academic dashboards.
  2. Implement real-time communication and announcement features.
  3. Build an evaluation and reporting module for student performance monitoring.
  4. Integrate AI-supported tools: guided chatbot, video summarization, and word translation.
  5. Add gamified learning challenges to increase engagement and participation.
  6. Evaluate the system based on functionality, reliability, usability, portability, and efficiency.

  ## Core Users

  - Administrators: Manage users, access control, and enrollment records.
  - Teachers: Manage instructional materials, assignments, assessment, and feedback.
  - Students: Access schedules and resources, submit outputs, and track progress.

  ## High-Level Features

  - User and role management
  - Tutorial scheduling and timetable visibility
  - Learning material distribution
  - Assignment and video submission handling
  - Rubric-based evaluation and feedback
  - Real-time messaging and announcements
  - Academic progress tracking and report generation
  - AI-guided chatbot support
  - AI video summarization with English transcription
  - Integrated word translation support
  - Gamified challenges, rewards, and progress mechanics
  - Deadline and announcement notifications

  For a detailed module-by-module specification, see the project details file:

  - [PROJECT DETAILS.md](PROJECT%20DETAILS.md)

  ## Scope

  YUNAfied is scoped as a web-based tutorial management system for the YUNA learning environment. It focuses on centralizing tutorial operations and improving collaboration among administrators, teachers, and students.

  In scope:

  - Account and access administration
  - Scheduling and timetable management
  - Instructional content and task management
  - Submission, grading, and feedback workflows
  - Communication and notifications
  - Performance analytics and reporting
  - AI-assisted and gamified learning components

  ## Delimitations

  - The AI-guided chatbot provides step-by-step guidance but does not give complete direct answers to academic problems.
  - AI video summarization is English-only and does not validate academic correctness of submitted content.
  - The platform supports teaching and learning workflows but does not replace classroom instruction or official institutional grading policies.

  ## Technology Direction

  The project is implemented as a modern web application using:

  - Frontend: React + TypeScript (Vite-based setup)
  - Backend/Services: Node.js-compatible service architecture and serverless integrations
  - Data Layer: Database-backed academic records and activity tracking
  - AI Integrations: APIs/services for guided assistance and video summarization

  ## Quality Targets

  System evaluation is aligned with the following quality criteria:

  - Functionality
  - Reliability
  - Usability
  - Portability
  - Efficiency

  ## Expected Impact

  YUNAfied aims to improve tutorial delivery by reducing fragmented workflows, strengthening teacher-student communication, increasing student engagement, and enabling clearer academic progress visibility across the institution.

  ## Development Setup

  Install dependencies:

  ```bash
  npm install
  ```

  Run the development server:

  ```bash
  npm run dev
  ```

  Run backend (separate terminal):

  ```bash
  npm run dev --prefix backend
  ```

  Initialize backend database and demo users:

  ```bash
  npm run db:init --prefix backend
  npm run db:seed --prefix backend
  ```

  Optional full local run (frontend + backend):

  ```bash
  npm run dev:full
  ```

  ## 40% System Scope (Implemented)

  - User Management Module (register/login, role-based access, admin create/edit/delete)
  - Scheduling Module (admin/teacher create, all roles view)
  - Assignment Management Module (teacher posts, student submits file/text, stored in database)
  - Grading and Feedback Module (teacher/admin grade with feedback, student views result)
  - Announcement Module (teacher/admin post, students view)
  