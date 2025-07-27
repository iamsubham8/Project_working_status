import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, DocumentDuplicateIcon, ScissorsIcon, ArrowsRightLeftIcon, LockClosedIcon, LockOpenIcon, SparklesIcon, PhotoIcon } from '@heroicons/react/24/outline';
import './index.css';

const features = [
  { icon: <DocumentDuplicateIcon className="h-8 w-8 text-blue-500" />, title: 'Merge PDF', desc: 'Combine multiple PDFs into one.' },
  { icon: <ScissorsIcon className="h-8 w-8 text-pink-500" />, title: 'Split PDF', desc: 'Split a PDF into multiple files.' },
  { icon: <SparklesIcon className="h-8 w-8 text-yellow-500" />, title: 'Compress PDF', desc: 'Reduce PDF file size.' },
  { icon: <ArrowsRightLeftIcon className="h-8 w-8 text-green-500" />, title: 'Convert PDF', desc: 'PDF to Word, JPG, and more.' },
  { icon: <PhotoIcon className="h-8 w-8 text-purple-500" />, title: 'JPG to PDF', desc: 'Convert images to PDF.' },
  { icon: <LockClosedIcon className="h-8 w-8 text-red-500" />, title: 'Protect PDF', desc: 'Add password protection.' },
  { icon: <LockOpenIcon className="h-8 w-8 text-gray-500" />, title: 'Unlock PDF', desc: 'Remove PDF password.' },
];

function App() {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // handle file upload here
      alert(`File uploaded: ${e.dataTransfer.files[0].name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mt-16 mb-10"
      >
        <h1 className="text-5xl font-extrabold text-gray-800 mb-4 drop-shadow-lg">
          <span className="text-blue-600">iLovePDF</span> Clone
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          All-in-one PDF tools: Merge, split, compress, convert, protect, and more. Fast, free, and easy to use!
        </p>
      </motion.div>

      {/* Animated File Upload Area */}
      <motion.div
        className="w-full max-w-lg mx-auto mb-12"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        <div
          className="bg-white/80 border-2 border-dashed border-blue-400 rounded-xl p-8 flex flex-col items-center shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
          onClick={() => fileInput.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <CloudArrowUpIcon className="h-16 w-16 text-blue-400 mb-2 animate-bounce" />
          <p className="text-lg font-semibold text-gray-700 mb-2">Drag & drop your PDF or click to upload</p>
          <input ref={fileInput} type="file" accept="application/pdf" className="hidden" onChange={e => {
            if (e.target.files && e.target.files[0]) {
              alert(`File uploaded: ${e.target.files[0].name}`);
            }
          }} />
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.15
            }
          }
        }}
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="bg-white/90 rounded-xl p-6 flex flex-col items-center shadow-md hover:shadow-xl transition-shadow duration-300"
            whileHover={{ scale: 1.05, y: -4 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
          >
            {f.icon}
            <h3 className="mt-3 text-xl font-bold text-gray-800">{f.title}</h3>
            <p className="text-gray-500 text-center mt-1">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <footer className="text-gray-400 text-sm mb-4">&copy; {new Date().getFullYear()} iLovePDF Clone. All rights reserved.</footer>
    </div>
  );
}

export default App;
