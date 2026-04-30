import React from 'react';
import { BookOpenCheck, CalendarClock, GraduationCap, Sparkles, Users2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemLogo } from '@/app/components/SystemLogo';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.30),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.20),transparent_30%)]" />

      <header className="relative max-w-7xl mx-auto px-6 md:px-10 pt-8 flex items-center justify-between">
        <SystemLogo textClassName="text-white" imageClassName="ring-1 ring-white/15 shadow-lg shadow-violet-700/30" />
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded-lg bg-white text-indigo-900 font-semibold hover:bg-indigo-100 transition"
        >
          Login
        </button>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-12">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200 bg-cyan-400/10 border border-cyan-300/20 px-3 py-1 rounded-full">
              Built for the 40% System Implementation
            </p>
            <h2 className="text-4xl md:text-6xl font-black mt-4 leading-[1.02]">
              Smarter Tutorials,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300">
                Guided by YUNA AI
              </span>
            </h2>
            <p className="mt-5 text-indigo-100/90 text-base md:text-lg max-w-2xl leading-relaxed">
              Manage schedules, assignments, grading, announcements, progress tracking, and AI learning support in one unified education platform for admins, teachers, and students.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-800/40 transition"
              >
                Get Started
              </button>
              <a
                href="#features"
                className="px-6 py-3 rounded-xl border border-white/30 hover:border-cyan-300 hover:text-cyan-200 transition font-semibold"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Role-Based Access', text: 'Dedicated modules for admin, teacher, and student workflows.', icon: Users2 },
              { title: 'Smart Scheduling', text: 'Centralized classes and activity time blocks with conflict-free planning.', icon: CalendarClock },
              { title: 'Assignments & Feedback', text: 'Submission tracking, grading, and clear feedback loops.', icon: BookOpenCheck },
              { title: 'AI Learning Tools', text: 'YUNA chatbot, translator, and study guide for guided learning.', icon: GraduationCap },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/20 border border-violet-300/30 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-violet-100" />
                  </div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-sm text-indigo-100/80 mt-1 leading-relaxed">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="features" className="mt-16 md:mt-20 rounded-3xl border border-white/10 bg-black/20 backdrop-blur p-7 md:p-10">
          <h3 className="text-2xl md:text-3xl font-black">System Purpose</h3>
          <p className="mt-3 text-indigo-100/90 max-w-3xl">
            YUNAFied supports tutorial operations and student success through structured management tools plus AI assistance.
            It aligns with your paper's goal of making tutorial delivery measurable, accessible, and engaging.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl bg-violet-500/10 border border-violet-300/20 p-4">
              <p className="font-semibold text-violet-100">Administration</p>
              <p className="text-indigo-100/85 mt-1">User governance, analytics visibility, and platform control.</p>
            </div>
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-300/20 p-4">
              <p className="font-semibold text-cyan-100">Instruction</p>
              <p className="text-indigo-100/85 mt-1">Lesson scheduling, assignment workflows, and announcement channels.</p>
            </div>
            <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-300/20 p-4">
              <p className="font-semibold text-fuchsia-100">Student Growth</p>
              <p className="text-indigo-100/85 mt-1">Milestones, guided AI study support, and translation assistance.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
