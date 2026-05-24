import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

interface Article {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  image: string;
}

export const HealthEducation: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['All Topics', 'Preventive Care', 'Chronic Conditions', 'Mental Health', 'Nutrition', 'Fitness'];

  const articles: Article[] = [
    {
      id: '1',
      title: 'Understanding High Blood Pressure: Prevention and Management',
      category: 'Chronic Conditions',
      excerpt: 'Learn about hypertension, its risk factors, and effective strategies for maintaining healthy blood pressure levels.',
      readTime: '5 min read',
      image: 'https://images.pexels.com/photos/7659564/pexels-photo-7659564.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: '2',
      title: 'The Importance of Annual Health Screenings',
      category: 'Preventive Care',
      excerpt: 'Discover why regular health check-ups are crucial for early detection and prevention of serious health conditions.',
      readTime: '4 min read',
      image: 'https://images.pexels.com/photos/7659573/pexels-photo-7659573.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: '3',
      title: 'Managing Stress and Anxiety in Daily Life',
      category: 'Mental Health',
      excerpt: 'Practical techniques and strategies for reducing stress and improving mental well-being in your everyday routine.',
      readTime: '6 min read',
      image: 'https://images.pexels.com/photos/4498151/pexels-photo-4498151.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: '4',
      title: 'Building a Balanced Diet: Essential Nutrients Guide',
      category: 'Nutrition',
      excerpt: 'A comprehensive guide to understanding macronutrients, micronutrients, and creating a well-balanced meal plan.',
      readTime: '7 min read',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: '5',
      title: 'Effective Exercise Routines for Beginners',
      category: 'Fitness',
      excerpt: 'Start your fitness journey with these safe and effective workout routines designed for beginners.',
      readTime: '5 min read',
      image: 'https://images.pexels.com/photos/4162449/pexels-photo-4162449.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: '6',
      title: 'Diabetes: Understanding and Managing Blood Sugar',
      category: 'Chronic Conditions',
      excerpt: 'Essential information about diabetes management, blood sugar monitoring, and lifestyle modifications.',
      readTime: '6 min read',
      image: 'https://images.pexels.com/photos/7659567/pexels-photo-7659567.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      article.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center space-x-2 rounded-full border border-cyan-200 bg-white/90 px-5 py-2.5 text-cyan-700 shadow-sm">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm font-semibold">Expert Medical Content</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-slate-900 md:text-6xl">
            Health knowledge for
            <span className="block bg-gradient-to-r from-ceenai-cyan to-ceenai-blue bg-clip-text text-transparent">
              everyday decisions
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-slate-600">
            Explore trusted articles, preventive guidance, and condition explainers in the same
            visual system as the refreshed CeenAiX experience.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search articles
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={FORM_FIELD_LIMITS.searchQuery}
                  placeholder="Search for health topics..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
              >
                {categories.map((category) => (
                  <option key={category} value={category === 'All Topics' ? 'all' : category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-slate-600">No articles found. Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="group card-hover overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                      {article.category}
                    </span>
                    <span className="text-xs text-slate-500">{article.readTime}</span>
                  </div>
                  <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-ceenai-blue">
                    {article.title}
                  </h3>
                  <p className="line-clamp-3 text-sm text-slate-600">
                    {article.excerpt}
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Full article reader — coming soon"
                    className="mt-4 flex cursor-not-allowed items-center space-x-1 text-sm font-semibold text-slate-400 opacity-80"
                  >
                    <span>Read more</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-[2rem] bg-slate-950 p-8 text-center text-white shadow-xl">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
          <h2 className="mb-3 text-2xl font-bold">Want personalized health insights?</h2>
          <p className="mx-auto mb-6 max-w-2xl text-slate-300">
            Create a free account to get AI-powered health recommendations tailored to your needs
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="rounded-full bg-white px-8 py-3 font-bold text-slate-950 transition-colors hover:bg-slate-100"
          >
            Get Started Free
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
