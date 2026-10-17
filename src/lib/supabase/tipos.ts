// Generado desde el esquema de Supabase (generate_typescript_types) y recortado a lo que usa la app.
// Regenerar cuando cambie una migración.

export type TipoMovimiento = "INGRESO" | "GASTO" | "AHORRO" | "PARA_MI" | "OCIO";
export type ColorApp = "rojo" | "azul" | "verde" | "morado" | "negro";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categorias: {
        Row: {
          color: ColorApp;
          creado: string;
          icono: string;
          id: string;
          nombre: string;
          user_id: string;
          tope: number | null;
          tope_avisado: string | null;
        };
        Insert: { color: ColorApp; creado?: string; icono?: string; id?: string; nombre: string; user_id?: string; tope?: number | null };
        Update: { color?: ColorApp; icono?: string; nombre?: string; tope?: number | null };
        Relationships: [];
      };
      metas: {
        Row: {
          archivada: boolean;
          creado: string;
          fecha_objetivo: string | null;
          id: string;
          moneda: string;
          nombre: string;
          objetivo: number;
          user_id: string;
        };
        Insert: {
          archivada?: boolean;
          creado?: string;
          fecha_objetivo?: string | null;
          id?: string;
          moneda?: string;
          nombre: string;
          objetivo: number;
          user_id?: string;
        };
        Update: {
          archivada?: boolean;
          creado?: string;
          fecha_objetivo?: string | null;
          id?: string;
          moneda?: string;
          nombre?: string;
          objetivo?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      movimientos: {
        Row: {
          categoria_id: string | null;
          concepto: string;
          creado: string;
          fecha: string;
          id: string;
          meta_id: string | null;
          moneda: string;
          monto: number;
          monto_base: number | null;
          nota: string;
          recurrente: boolean;
          tipo: TipoMovimiento;
          tipo_cambio: number;
          user_id: string;
        };
        Insert: {
          categoria_id?: string | null;
          concepto: string;
          creado?: string;
          fecha?: string;
          id?: string;
          meta_id?: string | null;
          moneda?: string;
          monto: number;
          nota?: string;
          recurrente?: boolean;
          tipo: TipoMovimiento;
          tipo_cambio?: number;
          user_id?: string;
        };
        Update: {
          categoria_id?: string | null;
          concepto?: string;
          fecha?: string;
          meta_id?: string | null;
          moneda?: string;
          monto?: number;
          nota?: string;
          recurrente?: boolean;
          tipo?: TipoMovimiento;
          tipo_cambio?: number;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_meta_id_user_id_fkey";
            columns: ["meta_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "metas";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      perfiles: {
        Row: {
          actualizado: string;
          creado: string;
          dia_pago: number;
          id: string;
          moneda_base: string;
          moneda_sueldo: string;
          nombre: string;
          sueldo_mensual: number;
        };
        Insert: {
          id: string;
          dia_pago?: number;
          moneda_base?: string;
          moneda_sueldo?: string;
          nombre?: string;
          sueldo_mensual?: number;
        };
        Update: {
          dia_pago?: number;
          moneda_base?: string;
          moneda_sueldo?: string;
          nombre?: string;
          sueldo_mensual?: number;
        };
        Relationships: [];
      };
      push_suscripciones: {
        Row: { auth: string; creado: string; endpoint: string; id: string; p256dh: string; user_id: string };
        Insert: { auth: string; endpoint: string; p256dh: string; user_id?: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      tokens_atajo: {
        Row: {
          creado: string;
          hash_token: string;
          ultimo_uso: string | null;
          user_id: string;
          usos_ventana: number;
          ventana_inicio: string | null;
        };
        Insert: { hash_token: string; user_id?: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      tipos_cambio: {
        Row: { fecha: string; moneda: string; valor_pen: number };
        Insert: { fecha: string; moneda: string; valor_pen: number };
        Update: { fecha?: string; moneda?: string; valor_pen?: number };
        Relationships: [];
      };
    };
    Views: {
      resumen_mensual: {
        Row: {
          cantidad: number | null;
          mes: string | null;
          tipo: TipoMovimiento | null;
          total: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      cambiar_moneda_base: {
        Args: { p_factor: number; p_nueva: string };
        Returns: undefined;
      };
      gastos_por_categoria: {
        Args: { p_desde: string; p_hasta: string };
        Returns: { categoria_id: string; color: ColorApp; nombre: string; total: number }[];
      };
      ping: { Args: never; Returns: number };
      generar_recurrentes: { Args: { p_token: string }; Returns: number };
      recordatorios_del_dia: {
        Args: { p_token: string };
        Returns: { r_auth: string; r_cuerpo: string; r_endpoint: string; r_p256dh: string; r_titulo: string; r_url: string }[];
      };
      eliminar_suscripcion_vencida: {
        Args: { p_token: string; p_endpoint: string };
        Returns: undefined;
      };
      registrar_por_atajo: {
        Args: { p_categoria?: string; p_concepto: string; p_monto: number; p_tipo?: string; p_token: string };
        Returns: { concepto: string; monto: number; moneda: string };
      };
      resumen_filtrado: {
        Args: {
          p_categoria?: string;
          p_desde: string;
          p_hasta: string;
          p_texto?: string;
          p_tipo?: TipoMovimiento;
        };
        Returns: { cantidad: number; tipo: TipoMovimiento; total: number }[];
      };
    };
    Enums: { color_app: ColorApp; tipo_movimiento: TipoMovimiento };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Meta = Database["public"]["Tables"]["metas"]["Row"];
export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"];
