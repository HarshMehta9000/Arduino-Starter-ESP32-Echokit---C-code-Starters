import { SimProvider } from "@/lib/sim";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Bench from "@/components/Bench";
import SourceDiff from "@/components/SourceDiff";
import PortLab from "@/components/PortLab";
import Media from "@/components/Media";
import Review from "@/components/Review";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SimProvider>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Bench />
        <SourceDiff />
        <PortLab />
        <Media />
        <Review />
      </main>
      <Footer />
    </SimProvider>
  );
}
