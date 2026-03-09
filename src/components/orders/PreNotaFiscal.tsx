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
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let y = margin;

    // Cores profissionais
    const primaryColor: [number, number, number] = [41, 98, 255]; // Azul profissional
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightGrayColor: [number, number, number] = [240, 240, 240];

    // ===== CABEÇALHO =====
    // Fundo colorido no topo
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PRÉ-NOTA FISCAL", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RESUMO FISCAL DA VENDA", pageWidth / 2, 23, { align: "center" });

    // Número da pré-nota e data
    doc.setFontSize(8);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 30, { align: "center" });

    y = 45;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // ===== DADOS DA EMPRESA =====
    // Box com fundo cinza
    doc.setFillColor(...lightGrayColor);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("DADOS DO EMITENTE", margin + 3, y + 5.5);
    
    y += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const empresaLines = [
      { label: "Razão Social:", value: fiscalData.fiscal_razao_social || "-" },
      { label: "Nome Fantasia:", value: fiscalData.fiscal_nome_fantasia || "-" },
      { label: "CNPJ:", value: fiscalData.fiscal_cnpj || "-" },
      { label: "Inscrição Municipal:", value: fiscalData.fiscal_inscricao_municipal || "-" },
      { label: "Endereço:", value: fiscalData.fiscal_endereco || "-" },
    ];

    empresaLines.forEach((line) => {
      doc.setFont("helvetica", "bold");
      doc.text(line.label, margin + 3, y);
      doc.setFont("helvetica", "normal");
      doc.text(line.value, margin + 40, y);
      y += 5;
    });

    y += 5;

    // ===== DADOS DO CLIENTE =====
    doc.setFillColor(...lightGrayColor);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("DADOS DO DESTINATÁRIO", margin + 3, y + 5.5);
    
    y += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Extract CPF from order notes if present
    let cpf = null;
    if (order.notes) {
      const cpfMatch = order.notes.match(/CPF na nota:\s*(\d{11})/);
      if (cpfMatch) cpf = cpfMatch[1];
    }

    const clienteLines = [
      { label: "Nome:", value: order.clients?.name || "-" },
      { label: "Telefone:", value: order.clients?.phone || "-" },
      { label: "CPF:", value: cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "Não informado" },
      { label: "Endereço:", value: order.clients?.address || "-" },
    ];

    clienteLines.forEach((line) => {
      doc.setFont("helvetica", "bold");
      doc.text(line.label, margin + 3, y);
      doc.setFont("helvetica", "normal");
      doc.text(line.value, margin + 30, y);
      y += 5;
    });

    y += 5;

    // ===== DADOS DA VENDA =====
    doc.setFillColor(...lightGrayColor);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("DETALHES DA OPERAÇÃO", margin + 3, y + 5.5);
    
    y += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    const vendaLines = [
      { label: "Pedido Nº:", value: order.tracking_code || "-" },
      { label: "Data da Venda:", value: format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
      { label: "Forma de Pagamento:", value: order.payment_method || "-" },
    ];

    vendaLines.forEach((line) => {
      doc.setFont("helvetica", "bold");
      doc.text(line.label, margin + 3, y);
      doc.setFont("helvetica", "normal");
      doc.text(line.value, margin + 45, y);
      y += 5;
    });

    y += 5;

    // ===== ITENS DA VENDA =====
    doc.setFillColor(...lightGrayColor);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("ITENS DA VENDA", margin + 3, y + 5.5);
    
    y += 12;

    // Cabeçalho da tabela
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 7, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Qtd", margin + 3, y);
    doc.text("Produto", margin + 15, y);
    doc.text("Valor Unit.", pageWidth - margin - 45, y);
    doc.text("Subtotal", pageWidth - margin - 20, y, { align: "right" });

    y += 7;

    // Itens
    doc.setFont("helvetica", "normal");
    let subtotalProdutos = 0;
    
    order.order_items.forEach((item) => {
      const name = item.products?.name || "Item";
      const subtotal = item.quantity * Number(item.unit_price);
      subtotalProdutos += subtotal;
      
      doc.text(String(item.quantity), margin + 3, y);
      doc.text(name.substring(0, 50), margin + 15, y);
      doc.text(`R$ ${Number(item.unit_price).toFixed(2)}`, pageWidth - margin - 45, y);
      doc.text(`R$ ${subtotal.toFixed(2)}`, pageWidth - margin - 3, y, { align: "right" });
      y += 5;
    });

    // Linha separadora
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Subtotal e taxa de entrega
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal dos produtos:", margin + 3, y);
    doc.text(`R$ ${subtotalProdutos.toFixed(2)}`, pageWidth - margin - 3, y, { align: "right" });
    y += 5;

    if (order.delivery_fee && Number(order.delivery_fee) > 0) {
      doc.text("Taxa de entrega:", margin + 3, y);
      doc.text(`R$ ${Number(order.delivery_fee).toFixed(2)}`, pageWidth - margin - 3, y, { align: "right" });
      y += 5;
    }

    // Total
    y += 2;
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 9, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("VALOR TOTAL:", margin + 3, y + 1.5);
    doc.text(`R$ ${Number(order.total_amount).toFixed(2)}`, pageWidth - margin - 3, y + 1.5, { align: "right" });

    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    // ===== OBSERVAÇÕES =====
    if (order.notes) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Observações:", margin + 3, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      const notes = order.notes.split('\n').filter(n => !n.includes('CPF na nota'));
      notes.forEach(note => {
        if (y > pageHeight - 40) return; // Evitar overflow
        doc.text(note.substring(0, 90), margin + 3, y);
        y += 4;
      });
    }

    // ===== RODAPÉ =====
    const footerY = pageHeight - 25;
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(7);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "italic");
    
    const disclaimer = "Este documento é um resumo fiscal da operação e não substitui a Nota Fiscal eletrônica oficial.";
    doc.text(disclaimer, pageWidth / 2, footerY + 5, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text("Documento gerado eletronicamente - Válido sem assinatura", pageWidth / 2, footerY + 10, { align: "center" });

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
