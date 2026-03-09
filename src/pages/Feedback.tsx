import DashboardLayout from "@/components/DashboardLayout";
import { SystemFeedbackForm } from "@/components/settings/SystemFeedbackForm";

const Feedback = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Opiniões sobre o Sistema</h1>
          <p className="text-muted-foreground">
            Nos ajude a melhorar! Compartilhe sua opinião sobre o sistema Grape.
          </p>
        </div>
        <SystemFeedbackForm />
      </div>
    </DashboardLayout>
  );
};

export default Feedback;
