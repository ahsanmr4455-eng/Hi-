export interface SectionItem {
  id: string;
  label: string;
  description: string;
  iconName: string;
  defaultFolders: string[]; // Folder names auto-generated when this section is enabled
}

export interface SectionCategory {
  category: string;
  iconName: string;
  sections: SectionItem[];
}

export const WORKSPACE_SECTION_CATEGORIES: SectionCategory[] = [
  {
    category: "GENERAL",
    iconName: "Grid",
    sections: [
      { id: "overview", label: "Overview", description: "Workspace dashboard & high level summaries", iconName: "LayoutDashboard", defaultFolders: ["Project Files", "Documents", "Contracts"] },
      { id: "projects", label: "Projects", description: "Active milestones, project updates and status", iconName: "FolderKanban", defaultFolders: ["Project Documentation", "Milestones & Deliverables"] },
      { id: "files_docs", label: "Files & Documents", description: "Centralized cloud file storage and repository", iconName: "Folder", defaultFolders: ["Documents", "Shared Storage"] },
      { id: "chat_comm", label: "Chat & Communication", description: "Direct real-time messaging and discussions", iconName: "MessageSquare", defaultFolders: [] },
    ]
  },
  {
    category: "WEBSITE / E-COMMERCE",
    iconName: "Globe",
    sections: [
      { id: "website", label: "Website", description: "Website source files, CMS exports & design mocks", iconName: "Globe", defaultFolders: ["Website Source Files", "Wireframes & Mocks"] },
      { id: "ecommerce", label: "E-Commerce", description: "Product catalog, store config and payment docs", iconName: "ShoppingCart", defaultFolders: ["Product Listings", "Store Credentials & Docs"] },
      { id: "domain_dns", label: "Domain & DNS", description: "Domain name records, NS configs and access info", iconName: "Network", defaultFolders: ["DNS Records & Access Credentials"] },
      { id: "hosting", label: "Hosting", description: "Server credentials, environment configs and logs", iconName: "Server", defaultFolders: ["Server Configs & Access Keys"] },
      { id: "ssl", label: "SSL", description: "SSL security certificates and setup documents", iconName: "ShieldCheck", defaultFolders: ["SSL Certificates & Keys"] },
      { id: "deployment", label: "Deployment", description: "Build artifacts, deployment pipelines & guides", iconName: "Rocket", defaultFolders: ["Build Artifacts", "Deployment Guides"] },
      { id: "maintenance_web", label: "Maintenance", description: "Site backups, update logs and speed audits", iconName: "Wrench", defaultFolders: ["Backups", "Audit Reports"] },
    ]
  },
  {
    category: "DESIGN",
    iconName: "Palette",
    sections: [
      { id: "graphic_design", label: "Graphic Design", description: "Graphics, banners, vectors and raw design files", iconName: "Palette", defaultFolders: ["Design Source Files", "Banners & Graphics"] },
      { id: "logo_identity", label: "Logo & Brand Identity", description: "Vector logos, color palettes and icon packs", iconName: "Sparkles", defaultFolders: ["Logo Source Files (AI, SVG)", "Brand Style Guides"] },
      { id: "branding_assets", label: "Branding Assets", description: "Typography fonts, imagery and marketing collateral", iconName: "Image", defaultFolders: ["Brand Assets", "Typography & Fonts"] },
      { id: "design_deliverables", label: "Design Deliverables", description: "Final export-ready design files and assets", iconName: "CheckCircle2", defaultFolders: ["Final Design Deliverables"] },
      { id: "brand_guidelines", label: "Brand Guidelines", description: "Official brand guidelines PDF and documentation", iconName: "FileText", defaultFolders: ["Brand Guidelines & Standards"] },
    ]
  },
  {
    category: "VIDEO / CREATIVE",
    iconName: "Film",
    sections: [
      { id: "video_editing", label: "Video Editing", description: "Timeline project files and video drafts", iconName: "Film", defaultFolders: ["Video Project Files", "Rough Cut Drafts"] },
      { id: "video_projects", label: "Video Projects", description: "Commercial, promotional and story videos", iconName: "Video", defaultFolders: ["Video Projects Master"] },
      { id: "raw_footage", label: "Raw Footage", description: "Unedited camera clips, B-roll and sound clips", iconName: "Clapperboard", defaultFolders: ["Raw Footage", "Audio & Sound FX"] },
      { id: "edited_videos", label: "Edited Videos", description: "Proofing versions and client review cuts", iconName: "PlaySquare", defaultFolders: ["Edited Video Drafts"] },
      { id: "final_deliverables_video", label: "Final Deliverables", description: "Full resolution 4K/1080p final video files", iconName: "Film", defaultFolders: ["Final Video Deliverables"] },
      { id: "thumbnails", label: "Thumbnails", description: "YouTube/Social media video cover graphics", iconName: "Image", defaultFolders: ["Thumbnails & Covers"] },
      { id: "motion_graphics", label: "Motion Graphics", description: "AfterEffects templates, lower thirds and FX", iconName: "Zap", defaultFolders: ["Motion Graphics & VFX"] },
    ]
  },
  {
    category: "MARKETING",
    iconName: "TrendingUp",
    sections: [
      { id: "digital_marketing", label: "Digital Marketing", description: "Ad strategy, funnel maps and campaign briefs", iconName: "TrendingUp", defaultFolders: ["Strategy & Funnels"] },
      { id: "seo", label: "SEO", description: "Keyword research, technical audits and backlinks", iconName: "Search", defaultFolders: ["SEO Keyword Research", "Technical SEO Audits"] },
      { id: "social_media", label: "Social Media", description: "Content calendars, post graphics and captions", iconName: "Share2", defaultFolders: ["Content Calendars", "Social Post Graphics"] },
      { id: "campaigns", label: "Campaigns", description: "Paid media creative and launch documentation", iconName: "Target", defaultFolders: ["Ad Campaign Assets"] },
      { id: "reports_marketing", label: "Reports & Analytics", description: "Monthly performance reports and metrics", iconName: "BarChart3", defaultFolders: ["Monthly Marketing Reports"] },
    ]
  },
  {
    category: "UGC / ADVERTISING",
    iconName: "Megaphone",
    sections: [
      { id: "ugc_ads", label: "UGC Ads", description: "User-generated content raw videos & creator cuts", iconName: "Megaphone", defaultFolders: ["UGC Creator Clips", "Script Briefs"] },
      { id: "ad_creatives", label: "Ad Creatives", description: "Image and short video ad variations for testing", iconName: "Layers", defaultFolders: ["Ad Creatives (Image & Video)"] },
      { id: "campaign_assets", label: "Campaign Assets", description: "Ad copy, landing page assets and target specs", iconName: "Package", defaultFolders: ["Campaign Assets"] },
      { id: "ad_reports", label: "Ad Reports", description: "Ad spend ROAS reports and analytics graphs", iconName: "PieChart", defaultFolders: ["Ad Performance Reports"] },
    ]
  },
  {
    category: "SOFTWARE / DEVELOPMENT",
    iconName: "Code",
    sections: [
      { id: "software_dev", label: "Software Development", description: "Repository mirrors, architecture diagrams & code", iconName: "Code", defaultFolders: ["Architecture Diagrams", "Source Code Archives"] },
      { id: "app_web_dev", label: "App/Web Development", description: "Mobile/web app source packages and builds", iconName: "Smartphone", defaultFolders: ["App Builds & Packages"] },
      { id: "dev_files", label: "Development Files", description: "Database schemas, API specs and environment scripts", iconName: "FileCode", defaultFolders: ["Database Schemas", "Environment Scripts"] },
      { id: "technical_docs", label: "Technical Documents", description: "System documentation and API integrations", iconName: "BookOpen", defaultFolders: ["Technical Documentation"] },
      { id: "releases", label: "Releases", description: "Version release logs and installer packages", iconName: "PackageCheck", defaultFolders: ["Release Packages (ZIP/APK)"] },
    ]
  },
  {
    category: "AI / AUTOMATION",
    iconName: "Bot",
    sections: [
      { id: "ai_automation", label: "AI Automation", description: "Custom workflows, Zapier/Make scripts & AI prompts", iconName: "Bot", defaultFolders: ["Workflow Blueprints", "Prompt Templates"] },
      { id: "chatbots", label: "Chatbots", description: "Chatbot prompt flows, knowledge bases & train data", iconName: "MessageCircle", defaultFolders: ["Knowledge Base Documents", "Bot Flow Configs"] },
      { id: "automation_projects", label: "Automation Projects", description: "Active automation scripts and system webhooks", iconName: "Workflow", defaultFolders: ["Automation Scripts"] },
    ]
  },
  {
    category: "SUPPORT",
    iconName: "Headphones",
    sections: [
      { id: "services_requests", label: "Services & Requests", description: "Custom service requests and change orders", iconName: "FileSpreadsheet", defaultFolders: ["Service Orders"] },
      { id: "support_tickets", label: "Support & Tickets", description: "Bug reports, maintenance requests & support logs", iconName: "Headphones", defaultFolders: ["Support Tickets & Guides"] },
    ]
  }
];

export const DEFAULT_FOLDER_CATEGORIES = [
  "Project Files",
  "Final Deliverables",
  "Raw Files",
  "Brand Assets",
  "Logos",
  "Videos",
  "Thumbnails",
  "Documents",
  "Contracts",
  "Credentials",
  "Reports",
  "Marketing",
  "UGC",
  "SEO",
  "Development",
  "Automation",
  "Designs",
  "Other"
];

// Compute all unique folder names from selected section IDs and folder categories
export function generateFoldersForWorkspace(enabledSectionIds: string[], selectedCategories: string[]): string[] {
  const folderSet = new Set<string>();

  // Add selected folder categories
  selectedCategories.forEach(cat => folderSet.add(cat));

  // Add auto-mapped folders for enabled sections
  WORKSPACE_SECTION_CATEGORIES.forEach(catGroup => {
    catGroup.sections.forEach(sec => {
      if (enabledSectionIds.includes(sec.id)) {
        sec.defaultFolders.forEach(f => folderSet.add(f));
      }
    });
  });

  return Array.from(folderSet);
}
