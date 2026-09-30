import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCanvas from "@/components/dashboard/DashboardCanvas";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1440px] mx-auto">
        <DashboardHeader />
        <DashboardCanvas />
      </div>
    </div>
  );
};

export default Index;
