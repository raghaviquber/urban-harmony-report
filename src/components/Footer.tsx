import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-card py-10">
    <div className="container">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            CivicReport
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            A modern civic issue reporting platform built for Smart India Hackathon 2026.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Contact</h4>
          <p className="text-sm text-muted-foreground">University Project &middot; Year 2026</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Developed by <span className="font-medium text-foreground">Student Name</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Smart India Hackathon</p>
        </div>
      </div>
      <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
        © 2026 CivicReport. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
