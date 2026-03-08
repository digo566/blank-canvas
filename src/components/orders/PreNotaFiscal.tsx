import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Download, Eye, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

interface OrderForNota {
  id: string;
  tracking_code: string;
  total_amount: number;
  delivery_fee: number | null;
  payment_method: string | null;
  created_at: string;
  clients: { name: string; phone: string; address: string | null } | null;
  order_items: { quantity: number; unit_price: number; products: { name: string } | null }[];
}

interface PreNota {
  id: string;
  pdf_url: string | null;
  created_at: string;
  valor_total: number;
}

export const PreNotaFiscal = ({ order }: { order: OrderForNota }) => {
  const [preNota, setPreNota] = useState<PreNota | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fiscalData, setFiscalData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [order.id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [notaRes, profileRes] = await Promise.all([
        supabase
          .from("pre_notas_fiscais" as any)
          .select("id, pdf_url, created_at, valor_total")
          .eq("order_id", order.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("fiscal_cnpj, fiscal_razao_social, fiscal_nome_fantasia, fiscal_inscricao_municipal, fiscal_endereco")
          .eq("id", user.id)
          .single(),
      ]);

      if (notaRes.data) setPreNota(notaRes.data as any);
      if (profileRes.data) setFiscalData(profileRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const hasFiscalData = fiscalData?.fiscal_cnpj && fiscalData?.fiscal_razao_social;

  const generatePDF = (): Blob => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO FISCAL DA VENDA", 105, y, { align: "center" });
    y += 12;

    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 10;

    // Company
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DA EMPRESA", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = [
      `Razão Social: ${fiscalData.fiscal_razao_social || "-"}`,
      `Nome Fantasia: ${fiscalData.fiscal_nome_fantasia || "-"}`,
      `CNPJ: ${fiscalData.fiscal_cnpj || "-"}`,
      `Inscrição Municipal: ${fiscalData.fiscal_inscricao_municipal || "-"}`,
      `Endereço: ${fiscalData.fiscal_endereco || "-"}`,
    ];
    lines.forEach((l) => { doc.text(l, margin, y); y += 6; });

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DADOS DO CLIENTE", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nome: ${order.clients?.name || "-"}`, margin, y); y += 6;

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DADOS DA VENDA", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Pedido: ${order.tracking_code}`, margin, y); y += 6;
    doc.text(`Descrição: Venda de alimentos via delivery`, margin, y); y += 6;

    // Items
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Itens:", margin, y); y += 6;
    doc.setFont("helvetica", "normal");
    order.order_items.forEach((item) => {
      const name = item.products?.name || "Item";
      const subtotal = (item.quantity * Number(item.unit_price)).toFixed(2);
      doc.text(`  ${item.quantity}x ${name} - R$ ${subtotal}`, margin, y);
      y += 6;
    });

    if (order.delivery_fee && Number(order.delivery_fee) > 0) {
      doc.text(`  Taxa de entrega: R$ ${Number(order.delivery_fee).toFixed(2)}`, margin, y);
      y += 6;
    }

    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Valor Total: R$ ${Number(order.total_amount).toFixed(2)}`, margin, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Forma de Pagamento: ${order.payment_method || "-"}`, margin, y); y += 6;
    doc.text(`Data da Venda: ${format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, y);
    y += 14;

    // Footer
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "Este documento é apenas um resumo fiscal da venda e não substitui a Nota Fiscal oficial.",
      105,
      y,
      { align: "center" }
    );

    return doc.output("blob");
  };

  const handleGenerate = async () => {
    if (!hasFiscalData) {
      toast.error("Preencha seus dados fiscais nas configurações antes de gerar a pré-nota.");
      return;
    }
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const blob = generatePDF();
      const fileName = `${user.id}/pre-nota-${order.id}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("pre-notas")
        .upload(fileName, blob, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("pre-notas").getPublicUrl(fileName);

      const { data: nota, error: insertError } = await supabase
        .from("pre_notas_fiscais" as any)
        .insert({
          order_id: order.id,
          restaurant_id: user.id,
          customer_name: order.clients?.name || null,
          company_cnpj: fiscalData.fiscal_cnpj,
          company_name: fiscalData.fiscal_razao_social,
          valor_total: order.total_amount,
          data_venda: order.created_at,
          pdf_url: urlData.publicUrl,
        })
        .select("id, pdf_url, created_at, valor_total")
        .single();

      if (insertError) throw insertError;
      setPreNota(nota as any);
      toast.success("Pré-nota fiscal gerada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar pré-nota: " + (err.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!hasFiscalData) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">📄 Pré-Nota Fiscal</p>
        <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-500/10 text-yellow-700 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Preencha seus dados fiscais em Configurações &gt; Fiscal antes de gerar a pré-nota.
        </div>
      </div>
    );
  }

  if (preNota) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">📄 Pré-Nota Fiscal</p>
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium">Documento fiscal gerado</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Nº: {preNota.id.slice(0, 8).toUpperCase()}</p>
            <p>Data: {format(new Date(preNota.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            <p>Valor: R$ {Number(preNota.valor_total).toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            {preNota.pdf_url && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => window.open(preNota.pdf_url!, "_blank")}
                >
                  <Eye className="h-3 w-3" /> Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = preNota.pdf_url!;
                    a.download = `pre-nota-${order.tracking_code}.pdf`;
                    a.click();
                  }}
                >
                  <Download className="h-3 w-3" /> Baixar PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">📄 Pré-Nota Fiscal</p>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2 text-xs"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
        Gerar Pré-Nota Fiscal
      </Button>
    </div>
  );
};
