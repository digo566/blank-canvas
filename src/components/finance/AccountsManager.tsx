import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AccountPayable, AccountReceivable } from "@/lib/finance/types";

export function AccountsManager() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [payableDialogOpen, setPayableDialogOpen] = useState(false);
  const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);

  const [newPayable, setNewPayable] = useState({
    supplier_name: "",
    amount: "",
    due_date: "",
    description: ""
  });

  const [newReceivable, setNewReceivable] = useState({
    client_name: "",
    amount: "",
    due_date: "",
    description: ""
  });

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [payablesRes, receivablesRes] = await Promise.all([
        supabase
          .from('accounts_payable')
          .select('*')
          .eq('restaurant_id', user.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('accounts_receivable')
          .select('*')
          .eq('restaurant_id', user.id)
          .order('due_date', { ascending: true })
      ]);

      if (payablesRes.data) setPayables(payablesRes.data as AccountPayable[]);
      if (receivablesRes.data) setReceivables(receivablesRes.data as AccountReceivable[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPayable = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('accounts_payable').insert({
        restaurant_id: user.id,
        supplier_name: newPayable.supplier_name,
        amount: parseFloat(newPayable.amount),
        due_date: newPayable.due_date,
        description: newPayable.description,
        status: 'pending'
      });

      if (error) throw error;

      toast.success("Conta a pagar adicionada");
      setPayableDialogOpen(false);
      setNewPayable({ supplier_name: "", amount: "", due_date: "", description: "" });
      fetchData();
    } catch (error) {
      toast.error("Erro ao adicionar conta");
    }
  };

  const handleAddReceivable = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('accounts_receivable').insert({
        restaurant_id: user.id,
        client_name: newReceivable.client_name,
        amount: parseFloat(newReceivable.amount),
        due_date: newReceivable.due_date,
        description: newReceivable.description,
        status: 'pending'
      });

      if (error) throw error;

      toast.success("Conta a receber adicionada");
      setReceivableDialogOpen(false);
      setNewReceivable({ client_name: "", amount: "", due_date: "", description: "" });
      fetchData();
    } catch (error) {
      toast.error("Erro ao adicionar conta");
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      toast.success("Marcado como pago");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleMarkReceived = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({ status: 'received', received_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      toast.success("Marcado como recebido");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'pending';
    
    if (status === 'paid' || status === 'received') {
      return <Badge className="bg-green-500">Pago</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const pendingPayables = payables.filter(p => p.status !== 'paid');
  const pendingReceivables = receivables.filter(r => r.status !== 'received');

  return (
    <Tabs defaultValue="payables">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="payables">
          Contas a Pagar ({pendingPayables.length})
        </TabsTrigger>
        <TabsTrigger value="receivables">
          Contas a Receber ({pendingReceivables.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="payables">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contas a Pagar</CardTitle>
            <Dialog open={payableDialogOpen} onOpenChange={setPayableDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conta a Pagar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Fornecedor</Label>
                    <Input
                      value={newPayable.supplier_name}
                      onChange={(e) => setNewPayable({ ...newPayable, supplier_name: e.target.value })}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={newPayable.amount}
                      onChange={(e) => setNewPayable({ ...newPayable, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={newPayable.due_date}
                      onChange={(e) => setNewPayable({ ...newPayable, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={newPayable.description}
                      onChange={(e) => setNewPayable({ ...newPayable, description: e.target.value })}
                      placeholder="Ex: Material de limpeza"
                    />
                  </div>
                  <Button onClick={handleAddPayable} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => (
                  <TableRow key={payable.id}>
                    <TableCell className="font-medium">{payable.supplier_name}</TableCell>
                    <TableCell>{payable.description || '-'}</TableCell>
                    <TableCell>{new Date(payable.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getStatusBadge(payable.status, payable.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {payable.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payable.status !== 'paid' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkPaid(payable.id)}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {payables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma conta a pagar
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="receivables">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contas a Receber</CardTitle>
            <Dialog open={receivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conta a Receber</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Cliente</Label>
                    <Input
                      value={newReceivable.client_name}
                      onChange={(e) => setNewReceivable({ ...newReceivable, client_name: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={newReceivable.amount}
                      onChange={(e) => setNewReceivable({ ...newReceivable, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={newReceivable.due_date}
                      onChange={(e) => setNewReceivable({ ...newReceivable, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={newReceivable.description}
                      onChange={(e) => setNewReceivable({ ...newReceivable, description: e.target.value })}
                      placeholder="Ex: Pedido fiado"
                    />
                  </div>
                  <Button onClick={handleAddReceivable} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map((receivable) => (
                  <TableRow key={receivable.id}>
                    <TableCell className="font-medium">{receivable.client_name}</TableCell>
                    <TableCell>{receivable.description || '-'}</TableCell>
                    <TableCell>{new Date(receivable.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getStatusBadge(receivable.status, receivable.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {receivable.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {receivable.status !== 'received' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkReceived(receivable.id)}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {receivables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma conta a receber
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
