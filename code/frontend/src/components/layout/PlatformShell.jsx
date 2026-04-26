import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function PlatformShell({ children, title, subtitle, actions }) {
  return (
    <div className="relative z-10 flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <AnimatePresence mode="wait">
          <motion.main
            key={title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.36, ease: 'easeOut' }}
            className="flex-1 px-4 pb-8 pt-6 md:px-7"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
