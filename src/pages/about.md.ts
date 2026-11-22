import type { APIRoute } from "astro";
import { getTeamMembers } from "../helpers/data/getTeam";
import { markdown, teamMarkdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const members = await getTeamMembers();

  return markdown(
    teamMarkdown(
      members.map((member) => ({
        name: member.name,
        title: member.role || member.title,
        slug: member.slug,
      })),
    ),
  );
};
