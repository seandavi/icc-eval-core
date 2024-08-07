import { getRepos } from "@/ingest/github";
import { getJournals } from "@/ingest/journals";
import { getOpportunities } from "@/ingest/opportunities";
import { getProjects } from "@/ingest/projects";
import { getPublications } from "@/ingest/publications";
import { browser } from "@/util/browser";
import { saveJson } from "@/util/file";
import { divider } from "@/util/log";

const { OUTPUT_PATH } = process.env;

divider("Opportunities");

const opportunities = await getOpportunities();

divider("Projects");

const { coreProjects, projects } = await getProjects(
  opportunities.map((opportunity) => opportunity.id),
);

divider("Publications");

const publications = await getPublications(
  projects.map((project) => project.core_project),
);
for (const coreProject of coreProjects)
  coreProject.publications = publications.filter(
    (publication) => publication.core_project === coreProject.id,
  ).length;

divider("Journals");

const journals = await getJournals(
  publications.map((publication) => publication.journal),
);

divider("GitHub");

const repos = await getRepos(coreProjects.map((coreProject) => coreProject.id));

divider("Saving");

/** save output data */
saveJson(opportunities, OUTPUT_PATH, "opportunities");
saveJson(coreProjects, OUTPUT_PATH, "core-projects");
saveJson(projects, OUTPUT_PATH, "projects");
saveJson(publications, OUTPUT_PATH, "publications");
saveJson(journals, OUTPUT_PATH, "journals");
saveJson(repos, OUTPUT_PATH, "repos");

await browser.close();
