import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formatDeliveryTime = (min: number, max: number): string => {
  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h${remainingMinutes}min`;
    }
    return `${minutes} min`;
  };
  
  return `${formatTime(min)} - ${formatTime(max)}`;
};

interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    restaurant_name: "",
    phone: "",
    logo_url: "",
    cover_url: "",
    opening_hours: {} as OpeningHours,
    min_delivery_time: 30,
    max_delivery_time: 60,
  });

  const weekDays = [
    { key: "monday", label: "Segunda-feira" },
    { key: "tuesday", label: "Terça-feira" },
    { key: "wednesday", label: "Quarta-feira" },
    { key: "thursday", label: "Quinta-feira" },
    { key: "friday", label: "Sexta-feira" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        const hours = typeof data.opening_hours === 'object' && data.opening_hours !== null
          ? data.opening_hours as OpeningHours
          : {};
        
        setProfile({
          restaurant_name: data.restaurant_name,
          phone: data.phone,
          logo_url: data.logo_url || "",
          cover_url: data.cover_url || "",
          opening_hours: hours,
          min_delivery_time: data.min_delivery_time || 30,
          max_delivery_time: data.max_delivery_time || 60,
        });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          restaurant_name: profile.restaurant_name,
          phone: profile.phone,
          logo_url: profile.logo_url,
          cover_url: profile.cover_url,
          opening_hours: profile.opening_hours,
          min_delivery_time: profile.min_delivery_time,
          max_delivery_time: profile.max_delivery_time,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (day: string, field: string, value: string | boolean) => {
    setProfile({
      ...profile,
      opening_hours: {
        ...profile.opening_hours,
        [day]: {
          ...profile.opening_hours[day],
          [field]: value,
        },
      },
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do seu restaurante</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="branding">Marca</TabsTrigger>
            <TabsTrigger value="delivery">Entrega</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Atualize as informações básicas do restaurante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="restaurant_name">Nome do Restaurante</Label>
                  <Input
                    id="restaurant_name"
                    value={profile.restaurant_name}
                    onChange={(e) => setProfile({ ...profile, restaurant_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+55 (11) 99999-9999"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo do Restaurante</CardTitle>
                <CardDescription>Faça upload do logo do seu restaurante</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  bucket="restaurant-images"
                  path="logo"
                  currentImageUrl={profile.logo_url}
                  onUploadComplete={(url) => setProfile({ ...profile, logo_url: url })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capa do Perfil</CardTitle>
                <CardDescription>Imagem de destaque do seu restaurante</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  bucket="restaurant-images"
                  path="cover"
                  currentImageUrl={profile.cover_url}
                  onUploadComplete={(url) => setProfile({ ...profile, cover_url: url })}
                />
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Entrega</CardTitle>
                <CardDescription>Configure o tempo estimado de entrega para seus clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="min_delivery_time">Tempo Mínimo (minutos)</Label>
                    <Input
                      id="min_delivery_time"
                      type="number"
                      min="1"
                      value={profile.min_delivery_time}
                      onChange={(e) => setProfile({ ...profile, min_delivery_time: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ex: 30 para "30 min"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_delivery_time">Tempo Máximo (minutos)</Label>
                    <Input
                      id="max_delivery_time"
                      type="number"
                      min="1"
                      value={profile.max_delivery_time}
                      onChange={(e) => setProfile({ ...profile, max_delivery_time: parseInt(e.target.value) || 0 })}
                      placeholder="60"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ex: 60 para "1h" (será exibido como "30-60 min" ou "30 min - 1h")
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Prévia:</p>
                  <p className="text-lg font-bold text-primary">
                    {formatDeliveryTime(profile.min_delivery_time, profile.max_delivery_time)}
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Tempo de Entrega
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>Configure os horários de abertura e fechamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {weekDays.map((day) => (
                  <div key={day.key} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{day.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Fechado</Label>
                      <Switch
                        checked={profile.opening_hours[day.key]?.closed || false}
                        onCheckedChange={(checked) => updateHours(day.key, "closed", checked)}
                      />
                    </div>
                    {!profile.opening_hours[day.key]?.closed && (
                      <>
                        <Input
                          type="time"
                          value={profile.opening_hours[day.key]?.open || "08:00"}
                          onChange={(e) => updateHours(day.key, "open", e.target.value)}
                          className="w-32"
                        />
                        <span>até</span>
                        <Input
                          type="time"
                          value={profile.opening_hours[day.key]?.close || "22:00"}
                          onChange={(e) => updateHours(day.key, "close", e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Horários
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
