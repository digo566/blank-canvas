import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/lib/finance/types";

export function ExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    category_id: "",
    expense_date: new Date().toISOString().split('T')[0],
    is_recurring: false
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "variable" as "fixed" | "variable"
  });

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [expensesRes, categoriesRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, category:expense_categories(*)')
          .eq('restaurant_id', user.id)
          .order('expense_date', { ascending: false }),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('restaurant_id', user.id)
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data.map(e => ({
          ...e,
          category: e.category as ExpenseCategory | undefined
        })));
      }
      if (categoriesRes.data) setCategories(categoriesRes.data as ExpenseCategory[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('expenses').insert({
        restaurant_id: user.id,
        amount: parseFloat(newExpense.amount),
        description: newExpense.description,
        category_id: newExpense.category_id || null,
        expense_date: newExpense.expense_date,
        is_recurring: newExpense.is_recurring
      });

      if (error) throw error;

      toast.success("Despesa adicionada");
      setDialogOpen(false);
      setNewExpense({
        amount: "",
        description: "",
        category_id: "",
        expense_date: new Date().toISOString().split('T')[0],
        is_recurring: false
      });
      fetchData();
    } catch (error) {
      toast.error("Erro ao adicionar despesa");
    }
  };

  const handleAddCategory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('expense_categories').insert({
        restaurant_id: user.id,
        name: newCategory.name,
        type: newCategory.type
      });

      if (error) throw error;

      toast.success("Categoria criada");
      setCategoryDialogOpen(false);
      setNewCategory({ name: "", type: "variable" });
      fetchData();
    } catch (error) {
      toast.error("Erro ao criar categoria");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success("Despesa removida");
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover despesa");
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedExpenses = expenses.filter(e => e.category?.type === 'fixed').reduce((sum, e) => sum + e.amount, 0);
  const variableExpenses = expenses.filter(e => e.category?.type === 'variable' || !e.category).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">R$ {totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Custos Fixos</p>
            <p className="text-xl font-bold">R$ {fixedExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Custos Variáveis</p>
            <p className="text-xl font-bold">R$ {variableExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Despesas</CardTitle>
          <div className="flex gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Categoria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Ex: Aluguel"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select 
                      value={newCategory.type} 
                      onValueChange={(v) => setNewCategory({ ...newCategory, type: v as "fixed" | "variable" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Custo Fixo</SelectItem>
                        <SelectItem value="variable">Custo Variável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddCategory} className="w-full">Criar Categoria</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Despesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Despesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Ex: Conta de luz"
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select 
                      value={newExpense.category_id} 
                      onValueChange={(v) => setNewExpense({ ...newExpense, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddExpense} className="w-full">Adicionar Despesa</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.expense_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell>
                    {expense.category ? (
                      <Badge variant={expense.category.type === 'fixed' ? 'default' : 'secondary'}>
                        {expense.category.name}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma despesa registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
