
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "galleries": {
                  Row: {
                    "base_select_count": number,"client_email": string | null,"client_name": string | null,"created_at": string,"expires_at": string | null,"extra_price_krw": number,"id": string,"password_hash": string | null,"photographer_id": string,"share_token": string,"status": Database["public"]['Enums']["gallery_status"],"submitted_at": string | null,"title": string,"trashed_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "base_select_count"?: number,"client_email"?: string | null,"client_name"?: string | null,"created_at"?: string,"expires_at"?: string | null,"extra_price_krw"?: number,"id"?: string,"password_hash"?: string | null,"photographer_id": string,"share_token"?: string,"status"?: Database["public"]['Enums']["gallery_status"],"submitted_at"?: string | null,"title": string,"trashed_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "base_select_count"?: number,"client_email"?: string | null,"client_name"?: string | null,"created_at"?: string,"expires_at"?: string | null,"extra_price_krw"?: number,"id"?: string,"password_hash"?: string | null,"photographer_id"?: string,"share_token"?: string,"status"?: Database["public"]['Enums']["gallery_status"],"submitted_at"?: string | null,"title"?: string,"trashed_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "galleries_photographer_id_fkey"
      columns: ["photographer_id"]
isOneToOne: false
      referencedRelation: "photographers"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"error": string | null,"gallery_id": string,"id": string,"recipient": string,"sent_at": string | null,"status": Database["public"]['Enums']["notification_status"],"type": Database["public"]['Enums']["notification_type"]
                  }
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"gallery_id": string,"id"?: string,"recipient": string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"type": Database["public"]['Enums']["notification_type"]
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"gallery_id"?: string,"id"?: string,"recipient"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"type"?: Database["public"]['Enums']["notification_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "amount_krw": number,"created_at": string,"extra_count": number,"gallery_id": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"paid_at": string | null,"payment_key": string | null,"raw": Json | null,"status": Database["public"]['Enums']["order_status"],"toss_order_id": string,"unit_price_krw": number
                  }
                  Insert: {
                    "amount_krw": number,"created_at"?: string,"extra_count": number,"gallery_id": string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"paid_at"?: string | null,"payment_key"?: string | null,"raw"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"toss_order_id": string,"unit_price_krw": number
                  }
                  Update: {
                    "amount_krw"?: number,"created_at"?: string,"extra_count"?: number,"gallery_id"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"paid_at"?: string | null,"payment_key"?: string | null,"raw"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"toss_order_id"?: string,"unit_price_krw"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_settings": {
                  Row: {
                    "bank_account": string | null,"bank_holder": string | null,"bank_name": string | null,"created_at": string,"photographer_id": string,"toss_client_key": string | null,"toss_secret_key_encrypted": string | null,"updated_at": string
                  }
                  Insert: {
                    "bank_account"?: string | null,"bank_holder"?: string | null,"bank_name"?: string | null,"created_at"?: string,"photographer_id": string,"toss_client_key"?: string | null,"toss_secret_key_encrypted"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bank_account"?: string | null,"bank_holder"?: string | null,"bank_name"?: string | null,"created_at"?: string,"photographer_id"?: string,"toss_client_key"?: string | null,"toss_secret_key_encrypted"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_settings_photographer_id_fkey"
      columns: ["photographer_id"]
isOneToOne: true
      referencedRelation: "photographers"
      referencedColumns: ["id"]
    }
                  ]
                },"photographers": {
                  Row: {
                    "created_at": string,"display_name": string,"email": string,"id": string,"studio_name": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"email": string,"id": string,"studio_name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email"?: string,"id"?: string,"studio_name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"photos": {
                  Row: {
                    "created_at": string,"filename": string,"gallery_id": string,"height": number | null,"id": string,"match_key": string,"original_key": string,"original_purged_at": string | null,"preview_key": string | null,"processing_status": Database["public"]['Enums']["photo_processing_status"],"size_bytes": number | null,"sort_order": number,"thumb_key": string | null,"width": number | null
                  }
                  Insert: {
                    "created_at"?: string,"filename": string,"gallery_id": string,"height"?: number | null,"id"?: string,"match_key": string,"original_key": string,"original_purged_at"?: string | null,"preview_key"?: string | null,"processing_status"?: Database["public"]['Enums']["photo_processing_status"],"size_bytes"?: number | null,"sort_order"?: number,"thumb_key"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"filename"?: string,"gallery_id"?: string,"height"?: number | null,"id"?: string,"match_key"?: string,"original_key"?: string,"original_purged_at"?: string | null,"preview_key"?: string | null,"processing_status"?: Database["public"]['Enums']["photo_processing_status"],"size_bytes"?: number | null,"sort_order"?: number,"thumb_key"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    }
                  ]
                },"retouch_pins": {
                  Row: {
                    "author": Database["public"]['Enums']["pin_author"],"body": string,"created_at": string,"gallery_id": string,"id": string,"photo_id": string,"resolved_at": string | null,"x": number,"y": number
                  }
                  Insert: {
                    "author": Database["public"]['Enums']["pin_author"],"body": string,"created_at"?: string,"gallery_id": string,"id"?: string,"photo_id": string,"resolved_at"?: string | null,"x": number,"y": number
                  }
                  Update: {
                    "author"?: Database["public"]['Enums']["pin_author"],"body"?: string,"created_at"?: string,"gallery_id"?: string,"id"?: string,"photo_id"?: string,"resolved_at"?: string | null,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "retouch_pins_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retouch_pins_photo_id_gallery_id_fkey"
      columns: ["photo_id","gallery_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id","gallery_id"]
    }
                  ]
                },"retouched_files": {
                  Row: {
                    "created_at": string,"file_key": string,"filename": string,"gallery_id": string,"id": string,"match_status": Database["public"]['Enums']["retouch_match_status"],"photo_id": string | null,"size_bytes": number | null
                  }
                  Insert: {
                    "created_at"?: string,"file_key": string,"filename": string,"gallery_id": string,"id"?: string,"match_status": Database["public"]['Enums']["retouch_match_status"],"photo_id"?: string | null,"size_bytes"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"file_key"?: string,"filename"?: string,"gallery_id"?: string,"id"?: string,"match_status"?: Database["public"]['Enums']["retouch_match_status"],"photo_id"?: string | null,"size_bytes"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "retouched_files_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retouched_files_photo_id_gallery_id_fkey"
      columns: ["photo_id","gallery_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id","gallery_id"]
    }
                  ]
                },"selections": {
                  Row: {
                    "created_at": string,"gallery_id": string,"id": string,"is_extra": boolean,"photo_id": string
                  }
                  Insert: {
                    "created_at"?: string,"gallery_id": string,"id"?: string,"is_extra"?: boolean,"photo_id": string
                  }
                  Update: {
                    "created_at"?: string,"gallery_id"?: string,"id"?: string,"is_extra"?: boolean,"photo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "selections_gallery_id_fkey"
      columns: ["gallery_id"]
isOneToOne: false
      referencedRelation: "galleries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "selections_photo_id_gallery_id_fkey"
      columns: ["photo_id","gallery_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id","gallery_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "owns_gallery":
{ Args: { "gid": string }; Returns: boolean
                           }
          }
          Enums: {
            "gallery_status": "draft"|"open"|"awaiting_payment"|"submitted"|"delivered"|"expired","notification_status": "queued"|"sent"|"failed","notification_type": "selection_submitted"|"retouch_delivered"|"expiry_warning","order_status": "pending"|"paid"|"failed"|"canceled","payment_method": "toss"|"manual","photo_processing_status": "pending"|"processing"|"ready"|"failed","pin_author": "client"|"photographer","retouch_match_status": "matched"|"unmatched"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "gallery_status": ["draft", "open", "awaiting_payment", "submitted", "delivered", "expired"],"notification_status": ["queued", "sent", "failed"],"notification_type": ["selection_submitted", "retouch_delivered", "expiry_warning"],"order_status": ["pending", "paid", "failed", "canceled"],"payment_method": ["toss", "manual"],"photo_processing_status": ["pending", "processing", "ready", "failed"],"pin_author": ["client", "photographer"],"retouch_match_status": ["matched", "unmatched"]
          }
        }
} as const

