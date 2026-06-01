// ─────────────────────────────────────────────────────────────
// Tipos de base de datos — espejo del schema de Supabase
// Actualizar si se agregan columnas o tablas nuevas
// ─────────────────────────────────────────────────────────────

export type ResourceType = "LABOR" | "MATERIAL" | "EQUIPMENT" | "SUBCONTRACT";
export type ProjectStatus = "active" | "paused" | "closed";
export type BudgetType = "venta" | "meta";
export type Currency = "PEN" | "USD";
export type UserRole =
  | "admin"
  | "project_manager"
  | "field_engineer"
  | "purchasing"
  | "warehouse"
  | "hr"
  | "readonly";

// ── Tablas ────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  ruc: string | null;
  plan: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  client: string | null;
  location: string | null;
  currency: Currency;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface ResourceCatalog {
  id: string;
  organization_id: string;
  resource_code: string;
  name: string;
  unit: string;
  resource_type: ResourceType;
  unit_price: number;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  project_id: string;
  budget_type: BudgetType;
  name: string;
  currency: Currency;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetChapter {
  id: string;
  budget_id: string;
  code: string;
  name: string;
  level: number;
  parent_id: string | null;
  sort_order: number;
  total: number;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  chapter_id: string | null;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApuLine {
  id: string;
  budget_item_id: string;
  resource_id: string | null;
  resource_type: ResourceType;
  description: string | null;
  unit: string | null;
  crew_size: number;
  yield_rate: number | null;
  quantity_per_unit: number | null;
  unit_price: number;
  subtotal: number;
  sort_order: number;
}

export interface ReajusteFormula {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface ReajusteMonomio {
  id: string;
  formula_id: string;
  coefficient: number;
  index_code: string;
  description: string | null;
}

// ── Almacén y Servicios ───────────────────────────────────────

export interface StockWithdrawal {
  id: string;
  project_id: string;
  stock_item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  withdrawal_date: string;
  created_at: string;
}

export interface ServiceOrderAdvance {
  id: string;
  service_order_id: string;
  advance_date: string;
  description: string | null;
  amount: number;
  percent: number | null;
  created_at: string;
}

// ── Vistas ───────────────────────────────────────────────────

export interface ProjectMaterialCost {
  project_id: string;
  costo_materiales: number;
}

export interface ProjectServiceCost {
  project_id: string;
  costo_servicios: number;
}

// ── Tipo Database para el cliente de Supabase ─────────────────

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at">;
        Update: Partial<Omit<Organization, "id" | "created_at">>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, "id" | "created_at">;
        Update: Partial<Omit<OrganizationMember, "id" | "created_at">>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at">;
        Update: Partial<Omit<Project, "id" | "created_at">>;
      };
      project_members: {
        Row: ProjectMember;
        Insert: Omit<ProjectMember, "id" | "created_at">;
        Update: Partial<Omit<ProjectMember, "id" | "created_at">>;
      };
      resource_catalog: {
        Row: ResourceCatalog;
        Insert: Omit<ResourceCatalog, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ResourceCatalog, "id" | "created_at">>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Budget, "id" | "created_at">>;
      };
      budget_chapters: {
        Row: BudgetChapter;
        Insert: Omit<BudgetChapter, "id">;
        Update: Partial<Omit<BudgetChapter, "id">>;
      };
      budget_items: {
        Row: BudgetItem;
        Insert: Omit<BudgetItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BudgetItem, "id" | "created_at">>;
      };
      apu_lines: {
        Row: ApuLine;
        Insert: Omit<ApuLine, "id">;
        Update: Partial<Omit<ApuLine, "id">>;
      };
      reajuste_formulas: {
        Row: ReajusteFormula;
        Insert: Omit<ReajusteFormula, "id" | "created_at">;
        Update: Partial<Omit<ReajusteFormula, "id" | "created_at">>;
      };
      reajuste_monomios: {
        Row: ReajusteMonomio;
        Insert: Omit<ReajusteMonomio, "id">;
        Update: Partial<Omit<ReajusteMonomio, "id">>;
      };
      stock_withdrawals: {
        Row: StockWithdrawal;
        Insert: Omit<StockWithdrawal, "id" | "created_at">;
        Update: Partial<Omit<StockWithdrawal, "id" | "created_at">>;
      };
      service_order_advances: {
        Row: ServiceOrderAdvance;
        Insert: Omit<ServiceOrderAdvance, "id" | "created_at">;
        Update: Partial<Omit<ServiceOrderAdvance, "id" | "created_at">>;
      };
    };
    Views: {
      project_material_cost: {
        Row: ProjectMaterialCost;
      };
      project_service_cost: {
        Row: ProjectServiceCost;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      resource_type: ResourceType;
      project_status: ProjectStatus;
      budget_type: BudgetType;
      currency: Currency;
      user_role: UserRole;
    };
  };
};
