import { Link } from "react-router-dom";
import { FileText, Search, CheckCircle, ArrowRight, BarChart3 } from "lucide-react";
import heroImage from "@/assets/hero-city.png";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
  {
    icon: FileText,
    title: "Report Issue",
    description: "Submit details about civic problems you encounter in your area.",
  },
  {
    icon: Search,
    title: "Authorities Review",
    description: "Concerned authorities review and prioritize submitted issues.",
  },
  {
    icon: CheckCircle,
    title: "Issue Resolved",
    description: "Issues are addressed and marked resolved with status updates.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Modern city infrastructure" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        <div className="container relative py-24 md:py-36">
          <div className="max-w-2xl animate-fade-in-up">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Civic Issue Reporting System
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/85 md:text-xl">
              Report civic problems in your area and help improve your community.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-lg bg-card px-6 py-3 font-semibold text-primary shadow-card transition hover:shadow-card-hover"
              >
                Report Issue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                <BarChart3 className="h-4 w-4" /> View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground">How It Works</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Three simple steps to make your community better.
          </p>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl bg-card p-8 shadow-card transition hover:shadow-card-hover"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                  <step.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
