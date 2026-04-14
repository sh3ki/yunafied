# YUNAfied Project Details

This document provides a detailed breakdown of YUNAfied features and functional behavior based on the project paper.

## 1. System Summary

YUNAfied is a centralized tutorial management platform for YUNA that supports administrators, teachers, and students through integrated scheduling, communication, evaluation, and AI-assisted learning tools.

## 2. Feature Architecture

### 2.1 Administrator Module

Purpose: Central system governance, access control, and enrollment management.

Functionalities:

- Create, update, disable, and manage user accounts.
- Assign user roles (Administrator, Teacher, Student).
- Enforce role-based access to pages and actions.
- Manage student enrollment records.
- Maintain user profile and account status information.
- Oversee system-level announcements and platform policy settings.

Expected outcomes:

- Controlled and secure user access.
- Accurate and up-to-date academic user records.

### 2.2 Scheduling Module

Purpose: Organize tutorial sessions and prevent timetable conflicts.

Functionalities:

- Create tutorial classes and assign time slots.
- Update or cancel schedules with immediate visibility.
- Show real-time timetable views for teachers and students.
- Detect and prevent conflicting schedule entries.
- Filter schedules by class, teacher, and student.

Expected outcomes:

- Reduced schedule overlap and missed sessions.
- Clear time management for all roles.

### 2.3 Teacher Module

Purpose: Support instructional workflow and academic supervision.

Functionalities:

- Upload and organize learning materials.
- Create assignments and define submission requirements.
- Set deadlines and grading criteria.
- Review assignment and video submissions.
- Evaluate outputs using rubric-based assessment.
- Provide comments, scores, and actionable feedback.

Expected outcomes:

- Faster task management and more consistent evaluation.
- Better monitoring of student learning progress.

### 2.4 Student Module

Purpose: Provide a unified student learning workspace.

Functionalities:

- View personalized schedules.
- Access posted learning materials.
- Submit assignments and video requirements.
- View teacher feedback and rubric results.
- Track progress via dashboard indicators.
- Receive reminders for deadlines and announcements.

Expected outcomes:

- Improved access to resources and responsibilities.
- Better self-monitoring of academic progress.

### 2.5 Communication Module

Purpose: Enable direct and timely interaction.

Functionalities:

- Real-time teacher-student messaging.
- Announcement posting for class-wide updates.
- Threaded communication for academic inquiries.
- Notification triggers for new messages and updates.

Expected outcomes:

- Reduced communication delays.
- Stronger collaboration in tutorial activities.

### 2.6 Evaluation and Reporting Module

Purpose: Track student performance and generate insights.

Functionalities:

- Aggregate assignment and participation records.
- Analyze trends in student performance.
- Generate progress reports automatically.
- Support teacher and admin review of class outcomes.

Expected outcomes:

- Data-informed tutorial interventions.
- Improved visibility of learner progress.

### 2.7 AI and Learning Support Module

Purpose: Enhance comprehension and support independent learning.

Functionalities:

- AI-guided chatbot provides step-by-step guidance.
- AI video summarization generates concise summaries from student videos.
- Automatic English transcription for video summarization inputs.
- Integrated word translator for unfamiliar English terms.

Expected outcomes:

- Improved student understanding and learning support.
- Faster teacher review of multimedia submissions.

### 2.8 Gamification Module

Purpose: Increase student motivation and participation.

Functionalities:

- Challenge-based learning tasks.
- Reward mechanics (points, badges, milestones).
- Progress tracking tied to tutorial engagement.
- Participation incentives connected to learning goals.

Expected outcomes:

- Higher learner engagement.
- More active participation in tutorial sessions.

### 2.9 Notification Module

Purpose: Keep users informed about critical events.

Functionalities:

- Deadline reminders.
- Announcement alerts.
- Submission and feedback notifications.
- Schedule change notifications.

Expected outcomes:

- Fewer missed deadlines and updates.
- Better academic responsiveness.

## 3. Role-Based Capability Matrix

| Capability | Administrator | Teacher | Student |
| --- | --- | --- | --- |
| Manage user accounts and roles | Yes | No | No |
| Manage enrollment records | Yes | No | No |
| Create and manage schedules | Yes | Yes (assigned classes) | No |
| View schedules | Yes | Yes | Yes |
| Upload learning materials | No | Yes | No |
| Create assignments | No | Yes | No |
| Submit assignments/videos | No | No | Yes |
| Evaluate and provide feedback | No | Yes | No |
| View grades/feedback/progress | Yes (monitoring) | Yes (class view) | Yes (own records) |
| Messaging and announcements | Yes | Yes | Yes |
| Access AI tools | Optional/Admin policy | Yes | Yes |

## 4. Key Workflows

### 4.1 Tutorial Delivery Workflow

1. Administrator configures users and class structure.
2. Teacher publishes schedules, materials, and assignments.
3. Student receives notifications and completes submissions.
4. Teacher evaluates outputs and sends feedback.
5. Evaluation module updates progress data and reports.

### 4.2 AI-Supported Learning Workflow

1. Student uses AI chatbot for guided problem-solving steps.
2. Student submits video requirement.
3. System processes English transcription and video summary.
4. Teacher reviews summarized output and full submission context.

## 5. Data Domains

Primary data managed by the system includes:

- User identities and role assignments
- Enrollment records
- Class schedules and timetable entries
- Learning materials and resources
- Assignments, submissions, and rubric scores
- Messages, announcements, and notifications
- AI interactions and generated summaries
- Gamification progress indicators

## 6. Non-Functional Targets

YUNAfied is evaluated against:

- Functionality: Correct feature behavior by role.
- Reliability: Stable performance during normal operations.
- Usability: Clear interfaces for all user groups.
- Portability: Web accessibility across common devices/browsers.
- Efficiency: Responsive task execution and data retrieval.

## 7. Scope and Delimitations

Scope:

- Web-based tutorial management and coordination for YUNA.
- Role-based collaboration across administration, teaching, and learning processes.

Delimitations:

- The AI chatbot guides reasoning and does not provide complete direct answers.
- AI video summarization supports English input and summary generation only.
- Video summarization does not determine academic correctness.
- The system supports but does not replace formal classroom teaching and official institutional grading policy.

## 8. Suggested Technical Direction

- Frontend: ReactJS/TypeScript interface for web clients.
- Backend services: Node.js-compatible API and service layer.
- Database: Structured storage for users, schedules, and academic artifacts.
- AI integration: External APIs for guided assistance and summarization.
- Security: Authentication, authorization, and role-based route protection.

## 9. Value Proposition

YUNAfied provides a unified and scalable academic support environment that reduces fragmented operations, improves tutorial quality, and enables better collaboration and learner engagement through integrated digital and AI-supported tools.
