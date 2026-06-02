import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import RotatingAnnouncementBar from '@/components/homepage/premium/RotatingAnnouncementBar';
import PremiumNavbar from '@/components/homepage/premium/PremiumNavbar';
import PremiumFooter from '@/components/homepage/premium/PremiumFooter';

export default function ShopPageWrapper({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings?: { activeHomepage?: string; announcementText?: string; instagramHandle?: string } | null;
}) {
  const premium = settings?.activeHomepage === 'catalogue';

  if (premium) {
    return (
      <div className="min-h-screen bg-white text-[#111] flex flex-col">
        <RotatingAnnouncementBar customText={settings?.announcementText} />
        <PremiumNavbar overHero={false} />
        <main className="flex-grow pt-[104px] pb-0">{children}</main>
        <PremiumFooter instagramHandle={settings?.instagramHandle} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <AnnouncementBar text={settings?.announcementText} />
      <Navbar variant="default" />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
