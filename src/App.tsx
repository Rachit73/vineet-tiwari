/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import React, { useState, useEffect, useRef, Component, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { 
  Code2, 
  Layers, 
  Cloud, 
  ArrowUpRight, 
  MapPin, 
  Zap, 
  MousePointer2, 
  Maximize2, 
  BarChart3,
  ChevronRight,
  X,
  Send,
  LogIn,
  LogOut,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  where,
  limit,
  getDocs,
  writeBatch,
  handleFirestoreError,
  OperationType,
  signInAnonymously,
  User
} from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData, useCollection } from 'react-firebase-hooks/firestore';

// --- Error Boundary ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 text-center bg-zinc-900 border border-red-500/20 rounded-3xl">
        <h2 className="text-xl font-bold text-red-500 mb-4">Application Error</h2>
        <p className="text-gray-400 text-sm mb-6">Something went wrong.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Reload App
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// --- Types ---

interface Enquiry {
  id?: string;
  fullName: string;
  email: string;
  brief: string;
  createdAt: any;
  status: 'new' | 'contacted' | 'closed';
}

// --- Components ---

const Modal = ({ isOpen, onClose, children, title = "Start a Project" }: { isOpen: boolean, onClose: () => void, children: React.ReactNode, title?: string }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const EnquiryForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '', brief: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const path = 'enquiries';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(onSuccess, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
        <p className="text-gray-500 text-sm">We'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Full Name</label>
        <input 
          required
          type="text" 
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="John Doe"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Phone / WhatsApp Number</label>
        <input 
          required
          type="tel" 
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+91 98765 43210"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Project Brief</label>
        <textarea 
          required
          rows={4}
          value={formData.brief}
          onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
          placeholder="Tell us about your vision..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
        />
      </div>
      <button 
        disabled={isSubmitting}
        type="submit"
        className="w-full py-4 bg-purple-600 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500 transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : (
          <>
            Send Enquiry <Send className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

const AdminDashboard = () => {
  const path = 'enquiries';
  const chatPath = 'chat_sessions';
  const enquiriesQuery = query(collection(db, path), orderBy('createdAt', 'desc'));
  const [snapshot, loading, error] = useCollection(enquiriesQuery);
  const [isCleaning, setIsCleaning] = useState(false);
  
  const enquiries = snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
  
  const stats = {
    total: enquiries.length,
    new: enquiries.filter((e: any) => e.status === 'new').length,
    contacted: enquiries.filter((e: any) => e.status === 'contacted').length,
    closed: enquiries.filter((e: any) => e.status === 'closed').length,
  };

  const handleCleanupChats = async () => {
    setIsCleaning(true);
    try {
      const now = Date.now();
      const q = query(collection(db, chatPath), where('expiresAt', '<', now));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      alert(`Cleaned up ${querySnapshot.size} expired chat sessions.`);
    } catch (err) {
      console.error("Cleanup error:", err);
      alert("Failed to cleanup chats.");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, path, id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${path}/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading enquiries...</div>;
  if (error) return <div className="py-12 text-center text-red-500">Error loading enquiries. Make sure you are an admin.</div>;

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'New', value: stats.new, color: 'text-purple-400' },
          { label: 'Contacted', value: stats.contacted, color: 'text-blue-400' },
          { label: 'Closed', value: stats.closed, color: 'text-green-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
            <span className={`text-xl font-bold block ${stat.color}`}>{stat.value}</span>
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
        <div>
          <h4 className="text-sm font-bold">Maintenance</h4>
          <p className="text-[10px] text-gray-500">Cleanup expired chat sessions (24h+)</p>
        </div>
        <button 
          onClick={handleCleanupChats}
          disabled={isCleaning}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors"
        >
          {isCleaning ? 'Cleaning...' : 'Cleanup Chats'}
        </button>
      </div>

      {enquiries?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No enquiries found.</div>
      ) : (
        enquiries?.map((enquiry: any) => (
          <div key={enquiry.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4 group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-base">{enquiry.fullName}</h4>
                <p className="text-xs text-purple-400">{enquiry.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-widest px-3 py-1 rounded-full font-bold ${
                  enquiry.status === 'new' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 
                  enquiry.status === 'contacted' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 
                  'bg-green-600/20 text-green-400 border border-green-500/20'
                }`}>
                  {enquiry.status}
                </span>
                <button 
                  onClick={() => handleDelete(enquiry.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 leading-relaxed">{enquiry.brief}</p>
            
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <div className="flex items-center gap-2 text-[9px] text-gray-600 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {enquiry.createdAt?.toDate().toLocaleDateString()}
              </div>
              
              <div className="flex gap-2">
                {enquiry.status === 'new' && (
                  <button 
                    onClick={() => handleUpdateStatus(enquiry.id, 'contacted')}
                    className="text-[9px] uppercase tracking-widest font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark Contacted
                  </button>
                )}
                {enquiry.status !== 'closed' && (
                  <button 
                    onClick={() => handleUpdateStatus(enquiry.id, 'closed')}
                    className="text-[9px] uppercase tracking-widest font-bold text-green-400 hover:text-green-300 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const BackgroundAnimation = () => {
  // Memoize random values so they don't recalculate on every render
  const paths = useMemo(() => [...Array(10)].map(() => ({
    d: `M ${Math.random() * 1000} ${Math.random() * 1000} Q ${Math.random() * 1000} ${Math.random() * 1000} ${Math.random() * 1000} ${Math.random() * 1000}`,
    duration: 10 + Math.random() * 10,
    delay: Math.random() * 5
  })), []);

  const nodes = useMemo(() => [...Array(15)].map(() => ({
    cx: Math.random() * 1000,
    cy: Math.random() * 1000,
    r: Math.random() * 2 + 1,
    duration: 4 + Math.random() * 4,
    delay: Math.random() * 10
  })), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="purpleGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Animated Lines */}
        {paths.map((path, i) => (
          <motion.path
            key={i}
            d={path.d}
            stroke="#a855f7"
            strokeWidth="0.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0], 
              opacity: [0, 0.3, 0],
              transition: { 
                duration: path.duration, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: path.delay
              } 
            }}
          />
        ))}

        {/* Pulsing Nodes */}
        {nodes.map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="#a855f7"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0], 
              scale: [0, 1.5, 0],
              transition: { 
                duration: node.duration, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: node.delay
              } 
            }}
          />
        ))}
      </svg>
    </div>
  );
};

const Navbar = ({ onOpenEnquiry, onOpenAdmin, onOpenChat }: { onOpenEnquiry: () => void, onOpenAdmin: () => void, onOpenChat: () => void }) => {
  const [user] = useAuthState(auth);
  const isAdmin = user?.email === "vt902214@gmail.com";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center backdrop-blur-sm bg-black/10"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-600 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tighter">WEB DEV</span>
      </div>
      
      <div className="hidden md:flex items-center gap-10 text-[11px] uppercase tracking-[0.2em] font-medium text-gray-400">
        {['Services', 'Work'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors duration-300">
            {item}
          </a>
        ))}
        <button onClick={onOpenChat} className="hover:text-white transition-colors duration-300 uppercase tracking-[0.2em]">
          Support
        </button>
        {isAdmin && (
          <button onClick={onOpenAdmin} className="hover:text-purple-500 transition-colors duration-300 uppercase tracking-[0.2em]">
            Admin
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {!user ? (
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="p-2 text-gray-400 hover:text-white transition-colors hidden md:block"
            title="Admin Login"
          >
            <LogIn className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors hidden md:block"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
        <button 
          className="md:hidden p-2 text-gray-400 hover:text-white z-50 relative"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
        </button>
      </div>
    </motion.nav>

    {/* Mobile Menu */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-40 bg-zinc-900/95 backdrop-blur-xl pt-24 px-6 flex flex-col gap-6"
        >
          {['Services', 'Work'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`} 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-bold tracking-tighter hover:text-purple-500 transition-colors"
            >
              {item}
            </a>
          ))}
          <button 
            onClick={() => { setIsMobileMenuOpen(false); onOpenChat(); }} 
            className="text-2xl font-bold tracking-tighter text-left hover:text-purple-500 transition-colors"
          >
            Support
          </button>
          {isAdmin && (
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onOpenAdmin(); }} 
              className="text-2xl font-bold tracking-tighter text-left text-purple-500"
            >
              Admin Dashboard
            </button>
          )}
          <div className="mt-auto pb-12">
            {!user ? (
              <button 
                onClick={() => { setIsMobileMenuOpen(false); signInWithPopup(auth, googleProvider); }}
                className="flex items-center gap-3 text-gray-400 hover:text-white"
              >
                <LogIn className="w-6 h-6" /> Sign In
              </button>
            ) : (
              <button 
                onClick={() => { setIsMobileMenuOpen(false); signOut(auth); }}
                className="flex items-center gap-3 text-red-500 hover:text-red-400"
              >
                <LogOut className="w-6 h-6" /> Sign Out
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

const Hero = ({ onOpenEnquiry }: { onOpenEnquiry: () => void }) => {
  return (
    <section className="relative h-screen flex flex-col justify-center px-4 md:px-24 z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <span className="text-purple-500 text-xs font-bold tracking-[0.3em] uppercase mb-6 block">
          Digital Agency — India's Tech Excellence
        </span>
        <h1 className="text-5xl md:text-8xl font-bold leading-[0.9] tracking-tighter max-w-4xl">
          CRAFTING <br />
          DIGITAL EXCELLENCE <br />
          FOR THE <span className="text-purple-500 glow-purple italic font-serif font-normal">FUTURE</span>
        </h1>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-12 flex flex-col md:flex-row items-start md:items-center gap-8"
        >
          <div className="flex items-center gap-4 text-gray-500">
            <div className="w-12 h-[1px] bg-gray-800" />
            <p className="text-sm tracking-wide max-w-xs">
              We build high-performance digital products for the next generation of Indian innovators.
            </p>
          </div>
        </motion.div>
      </motion.div>
      
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30"
      >
        <span className="text-[9px] uppercase tracking-widest">Scroll</span>
        <div className="w-[1px] h-12 bg-white" />
      </motion.div>
    </section>
  );
};

const Services = ({ onOpenEnquiry }: { onOpenEnquiry: () => void }) => {
  const services = [
    {
      title: "Web Development",
      icon: <Code2 className="w-6 h-6" />,
      desc: "Bespoke web applications built with cutting-edge frameworks for scale and speed."
    },
    {
      title: "App Design",
      icon: <Maximize2 className="w-6 h-6" />,
      desc: "Intuitive user experiences designed with a focus on conversion and aesthetic purity."
    },
    {
      title: "Cloud Hosting",
      icon: <Cloud className="w-6 h-6" />,
      desc: "Enterprise-grade infrastructure ensuring 99.9% uptime and global low-latency."
    }
  ];

  return (
    <section id="services" className="py-24 md:py-32 px-4 md:px-24 bg-black/40 relative z-10">
      <div className="mb-16">
        <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-500 mb-4">Services</h2>
        <div className="w-20 h-1 bg-purple-600" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ 
              delay: i * 0.15, 
              duration: 0.6, 
              type: "spring", 
              stiffness: 100, 
              damping: 20 
            }}
            whileHover={{ 
              y: -8, 
              scale: 1.02, 
              boxShadow: "0 20px 40px -10px rgba(168,85,247,0.15)",
              borderColor: "rgba(168,85,247,0.3)"
            }}
            className="p-10 bg-zinc-900/50 border border-white/5 rounded-2xl group"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-8 group-hover:bg-purple-600 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-500">
              <div className="text-gray-400 group-hover:text-white transition-colors">
                {service.icon}
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4">{service.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              {service.desc}
            </p>
            <button 
              onClick={onOpenEnquiry}
              className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 cursor-pointer"
            >
              Learn More <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Portfolio = ({ onOpenEnquiry }: { onOpenEnquiry: () => void }) => {
  const projects = [
    { title: "Lumina", category: "Fintech", img: "https://picsum.photos/seed/tech1/800/600" },
    { title: "Nexus", category: "SaaS", img: "https://picsum.photos/seed/tech2/800/600" },
    { title: "Aether", category: "AI Platform", img: "https://picsum.photos/seed/tech3/800/600" },
    { title: "Vortex", category: "E-commerce", img: "https://picsum.photos/seed/tech4/800/600" }
  ];

  return (
    <section id="work" className="py-24 md:py-32 px-4 md:px-24 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0 mb-12 md:mb-16">
        <div>
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-500 mb-4">Portfolio (Works)</h2>
          <div className="w-20 h-1 bg-purple-600" />
        </div>
        <button 
          onClick={onOpenEnquiry}
          className="text-xs font-bold uppercase tracking-widest hover:text-purple-500 transition-colors flex items-center gap-2 cursor-pointer"
        >
          View All Projects <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {projects.map((project, i) => (
          <motion.div
            key={project.title}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ 
              delay: i * 0.15, 
              duration: 0.6, 
              type: "spring", 
              stiffness: 100, 
              damping: 20 
            }}
            className="group cursor-pointer"
            onClick={onOpenEnquiry}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-900 border border-white/5">
              <img 
                src={project.img} 
                alt={project.title}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-10">
                <div className="w-full flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-purple-400 mb-2 block">{project.category}</span>
                    <h3 className="text-3xl font-bold">{project.title}</h3>
                  </div>
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section className="py-24 md:py-32 px-4 md:px-24 relative z-10 bg-zinc-950/50">
      <div className="max-w-4xl">
        <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-500 mb-12">About</h2>
        <p className="text-3xl md:text-5xl font-light leading-tight tracking-tight">
          Web Dev is a premiere digital agency founded by <span className="text-purple-500">Vineet</span>. 
          We merge technical precision with creative vision to build digital experiences that define the future. 
          Our mission is to empower innovators through <span className="italic font-serif">uncompromising quality</span> and 
          <span className="text-purple-500 glow-purple"> fluid motion</span>.
        </p>
        
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: "Projects", val: "150+" },
            { label: "Clients", val: "80+" },
            { label: "Awards", val: "12" },
            { label: "Team", val: "24" }
          ].map((stat) => (
            <div key={stat.label}>
              <span className="text-4xl font-bold block mb-2">{stat.val}</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = ({ onOpenEnquiry }: { onOpenEnquiry: () => void }) => {
  return (
    <section id="contact" className="py-24 md:py-32 px-4 md:px-24 relative z-10">
      <div className="bg-purple-600 rounded-[2rem] md:rounded-[3rem] p-8 md:p-24 flex flex-col md:flex-row justify-between items-center gap-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">READY TO START <br />YOUR PROJECT?</h2>
          <p className="text-white/70 max-w-md">
            Join the ranks of Indian innovators building the future of digital products.
          </p>
        </div>
        <button 
          onClick={onOpenEnquiry}
          className="relative z-10 px-12 py-6 bg-white text-purple-600 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95 shadow-2xl"
        >
          Get in Touch
        </button>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-16 md:py-20 px-4 md:px-24 border-t border-white/5 relative z-10 bg-black">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-purple-600 rounded-sm flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tighter">WEB DEV</span>
          </div>
          <p className="text-gray-500 text-sm max-w-xs mb-8">
            Building the digital future from the heart of India's tech capital.
          </p>
          <div className="flex gap-6">
            {['Twitter', 'LinkedIn', 'Instagram'].map(social => (
              <a key={social} href="#" className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-purple-500 transition-colors">
                {social}
              </a>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-10 md:gap-20">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-white mb-6">Explore</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Services</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Portfolio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Process</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-white mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li>vt902214@gmail.com</li>
              <li>+91 9022141119</li>
              <li>Vineet (Owner)</li>
              <li>Remote First, Global Presence</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">© 2026 WEB DEV Agency. All Rights Reserved.</span>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-widest">Proudly Made in India</span>
        </div>
      </div>
    </footer>
  );
};

// --- Chatbot ---

const Chatbot = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, timestamp: number }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensure anonymous login if not authenticated
  const attemptAuth = useCallback(async () => {
    if (user) return;
    try {
      await signInAnonymously(auth);
      setAuthError(null);
    } catch (err: any) {
      console.error("Anon login error:", err);
      if (err.code === 'auth/admin-restricted-operation') {
        setAuthError("Anonymous authentication is disabled in the Firebase Console. Please enable it to use the chatbot.");
      } else {
        setAuthError("Authentication failed. Please try again later.");
      }
    }
  }, [user]);

  useEffect(() => {
    attemptAuth();
  }, [attemptAuth]);

  // Load or create session
  useEffect(() => {
    if (!user) return;

    const chatPath = 'chat_sessions';
    const now = Date.now();
    const q = query(
      collection(db, chatPath),
      where('userId', '==', user.uid),
      where('expiresAt', '>', now),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setMessages(docData.messages || []);
        setSessionId(snapshot.docs[0].id);
      } else {
        // No active session, start fresh
        setMessages([{ 
          role: 'bot', 
          text: "Hi! I'm your Web Dev assistant. How can I help you today?",
          timestamp: Date.now()
        }]);
        setSessionId(null);
      }
    }, (err) => {
      console.error("Session load error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    const timestamp = Date.now();
    const newMessages = [...messages, { role: 'user' as const, text: userMessage, timestamp }];
    
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // 1. Get AI Response
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("AI Service is currently unavailable (Missing API Key).");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Gemini requires the conversation history to start with a 'user' message
      // and alternate between 'user' and 'model'.
      const historyToSend = [...messages];
      while (historyToSend.length > 0 && historyToSend[0].role === 'bot') {
        historyToSend.shift();
      }

      const formattedHistory: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
      
      for (const msg of historyToSend) {
        const mappedRole = msg.role === 'bot' ? 'model' : 'user';
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === mappedRole) {
          // Collapse consecutive messages from the same role
          formattedHistory[formattedHistory.length - 1].parts[0].text += `\n\n${msg.text}`;
        } else {
          formattedHistory.push({
            role: mappedRole,
            parts: [{ text: msg.text }]
          });
        }
      }
      
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
        formattedHistory[formattedHistory.length - 1].parts[0].text += `\n\n${userMessage}`;
      } else {
        formattedHistory.push({
          role: 'user',
          parts: [{ text: userMessage }]
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: formattedHistory,
        config: {
          systemInstruction: "You are a helpful, highly capable assistant for a premium website development agency called 'WEB DEV'. You answer questions related to website development, design, scaling, and performance. Be professional, concise, conversational, and friendly. If asked about pricing or starting a project, suggest they use the 'Get in Touch' button in the contact section. Keep your answers brief and easy to read.",
        },
      });

      let botText = "";
      setIsTyping(false);
      
      // Add an initial empty bot message
      setMessages(prev => [...prev, { role: 'bot', text: '', timestamp: Date.now() }]);

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          botText += c.text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = botText;
            return updated;
          });
        }
      }

      if (!botText) {
        botText = "I'm sorry, I couldn't process that.";
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = botText;
          return updated;
        });
      }

      const finalMessages = [...newMessages, { role: 'bot' as const, text: botText, timestamp: Date.now() }];

      // 2. Save to Firestore
      const chatPath = 'chat_sessions';
      try {
        if (sessionId) {
          await updateDoc(doc(db, chatPath, sessionId), {
            messages: finalMessages
          });
        } else {
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          const docRef = await addDoc(collection(db, chatPath), {
            userId: user.uid,
            messages: finalMessages,
            createdAt: Date.now(),
            expiresAt
          });
          setSessionId(docRef.id);
        }
      } catch (fsError) {
        handleFirestoreError(fsError, sessionId ? OperationType.UPDATE : OperationType.CREATE, chatPath);
      }
    } catch (error: any) {
      console.error("Chatbot error:", error);
      let errorMessage = "Sorry, I'm having trouble. Please try again.";
      
      // Check for specific errors
      if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage = "AI Service configuration error. Please contact support.";
      } else if (error.message?.includes('permission-denied')) {
        errorMessage = "Database access denied. Please refresh the page.";
      }

      setMessages(prev => [...prev, { role: 'bot', text: errorMessage, timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full h-full max-w-6xl md:h-[85vh] bg-zinc-900 border border-white/10 md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center bg-purple-600/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Web Dev Assistant</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">AI Support Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-3 hover:bg-white/5 rounded-full transition-colors group"
              >
                <X className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar bg-zinc-950/50"
            >
              <div className="max-w-3xl mx-auto space-y-8">
                {authError && (
                  <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-sm text-red-400 mb-8 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                        <Zap className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-xs">Configuration Required</p>
                    </div>
                    <p className="mb-4 leading-relaxed">{authError}</p>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-gray-400 mb-6">
                      <p className="mb-2">How to fix:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Firebase Console</li>
                        <li>Go to Authentication &gt; Sign-in method</li>
                        <li>Click "Add new provider"</li>
                        <li>Select "Anonymous" and click "Enable"</li>
                      </ol>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                      <button 
                        onClick={() => attemptAuth()}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20"
                      >
                        <Zap className="w-5 h-5" />
                        Retry Connection
                      </button>
                      
                      <div className="flex items-center gap-4 w-full">
                        <div className="h-px bg-white/10 flex-1" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Or</p>
                        <div className="h-px bg-white/10 flex-1" />
                      </div>

                      <button 
                        onClick={() => signInWithPopup(auth, googleProvider)}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-xl"
                      >
                        <LogIn className="w-5 h-5" />
                        Sign in with Google
                      </button>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-6 rounded-[2rem] text-base leading-relaxed shadow-xl ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-tr-none' 
                        : 'bg-zinc-800 text-gray-200 border border-white/5 rounded-tl-none'
                    }`}>
                      {msg.role === 'bot' ? (
                        <div className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 p-6 rounded-[2rem] rounded-tl-none border border-white/5">
                      <div className="flex gap-2">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 md:p-10 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md">
              <div className="max-w-3xl mx-auto relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={authError ? "Chat unavailable..." : "Type your message here..."}
                  disabled={!!authError || !user || isTyping}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-lg focus:outline-none focus:border-purple-500 transition-all pr-20 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping || !!authError || !user}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center text-white hover:bg-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-600 mt-6 uppercase tracking-[0.2em]">
                Your conversation is private and saved for 24 hours.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const smoothX = useSpring(mouseX, { damping: 30, stiffness: 150, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 30, stiffness: 150, mass: 0.5 });

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 200);
      mouseY.set(e.clientY - 200);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="relative bg-bg-dark min-h-screen selection:bg-purple-500/30">
      {/* Background Layer */}
      <div className="fixed inset-0 bg-blur-night opacity-20 pointer-events-none" />
      <BackgroundAnimation />
      
      {/* Custom Cursor Glow */}
      <motion.div 
        className="fixed w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0 will-change-transform"
        style={{
          x: smoothX,
          y: smoothY,
        }}
      />

      {/* Content */}
      <ErrorBoundary>
        <Navbar 
          onOpenEnquiry={() => setIsEnquiryOpen(true)} 
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenChat={() => setIsChatOpen(true)}
        />
        
        <main>
          <Hero onOpenEnquiry={() => setIsEnquiryOpen(true)} />
          <Services onOpenEnquiry={() => setIsEnquiryOpen(true)} />
          <Portfolio onOpenEnquiry={() => setIsEnquiryOpen(true)} />
          <About />
          <Contact onOpenEnquiry={() => setIsEnquiryOpen(true)} />
        </main>
        
        <Footer />
      </ErrorBoundary>
      
      {/* Chatbot */}
      <Chatbot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

      <Modal isOpen={isEnquiryOpen} onClose={() => setIsEnquiryOpen(false)}>
        <EnquiryForm onSuccess={() => setIsEnquiryOpen(false)} />
      </Modal>

      <Modal 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        title="Admin Dashboard"
      >
        <AdminDashboard />
      </Modal>
      
      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}
