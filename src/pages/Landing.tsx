import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Search,
  CheckCircle,
  Trash2,
  Recycle,
  Users,
  Shield,
  TrendingUp,
  Award,
  Heart,
  Moon,
  Sun,
} from "lucide-react";
import heroImage from "@/assets/hero-city.png";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";

const steps = [
  {
    icon: FileText,
    title: "Citizen Reports Issue",
    description: "Submit details about civic problems you encounter — potholes, broken lights, garbage overflow.",
  },
  {
    icon: Search,
    title: "Authority Receives & Resolves",
    description: "Concerned department reviews, prioritizes, and works on resolving the issue.",
  },
  {
    icon: CheckCircle,
    title: "Community Tracks Progress",
    description: "Citizens upvote issues and track resolution progress in real-time.",
  },
];

const whyCards = [
  {
    icon: Trash2,
    title: "Clean Streets",
    description: "Report waste overflow and sanitation issues for a cleaner neighborhood.",
  },
  {
    icon: Recycle,
    title: "Responsible Waste Management",
    description: "Help authorities identify and manage waste collection gaps efficiently.",
  },
  {
    icon: Users,
    title: "Public Participation",
    description: "Empower citizens to actively participate in civic governance and improvement.",
  },
  {
    icon: Shield,
    title: "Community Accountability",
    description: "Track issue resolution and hold authorities accountable for timely action.",
  },
];

const stats = [
  { label: "Issues Reported", value: "2,450+", icon: TrendingUp },
  { label: "Issues Resolved", value: "1,820+", icon: Award },
  { label: "Active Citizens", value: "5,100+", icon: Heart },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            CivicReport
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-primary px-5 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow transition-all duration-200 hover:brightness-110"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Modern city infrastructure" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-accent/40" />
        </div>
        <div className="container relative py-28 md:py-40">
          <div className="max-w-2xl animate-fade-in-up">
            <span className="mb-4 inline-block rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm">
              🏛️ Smart India Hackathon 2026
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Together for a Cleaner and Smarter City
            </h1>
            <p className="mt-5 text-lg text-primary-foreground/85 md:text-xl">
              Encourage citizens to report civic issues and participate in community improvement. Your voice matters.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 font-semibold text-accent-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110"
              >
                Report an Issue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-7 py-3.5 font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-foreground/10"
              >
                <BarChart3 className="h-4 w-4" /> Login / Sign Up
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Civic Participation Matters */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground">Why Civic Participation Matters</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Together, we can build cleaner, safer, and smarter cities.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((card) => (
              <div
                key={card.title}
                className="group rounded-xl bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground">How It Works</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Three simple steps to make your community better.
          </p>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-xl bg-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow">
                  {i + 1}
                </div>
                <div className="mb-5 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 transition-colors duration-300 group-hover:bg-accent/25">
                  <step.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground">Our Impact</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-xl bg-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-3xl font-extrabold text-foreground">{stat.value}</span>
                <span className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
