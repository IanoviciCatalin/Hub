import { Hero } from "@/components/Hero";
import { Categories } from "@/components/Categories";
import { FeaturedProject } from "@/components/FeaturedProject";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { SectionHeading } from "@/components/SectionHeading";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { projects } from "@/content/projects";

export default function Home() {
  const featured = projects.filter((p) => p.featured);
  return (
    <>
      <Hero />
      <Categories />
      <section id="proiecte" className="container-x flex scroll-mt-20 flex-col gap-10 border-t border-line pt-24">
        <SectionHeading eyebrow="Proiecte principale" title="Sisteme construite cap-coadă.">
          De la firmware și hardware până la aplicația cu care le folosești. Interacționează cu modelele: aprinde camerele, verifică pinii.
        </SectionHeading>
        <div className="flex flex-col gap-6">
          {featured.map((p, i) => (
            <FeaturedProject key={p.slug} project={p} flip={i % 2 === 1} />
          ))}
        </div>
        <div className="flex flex-col gap-6 pt-14">
          <SectionHeading eyebrow="Toate proiectele" title="Arhivă" />
          <ProjectExplorer projects={projects} />
        </div>
      </section>
      <About />
      <Contact />
    </>
  );
}
