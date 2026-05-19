import slug from "slug";
import teamData from "../../data/teamData.json";
import type { TeamMember } from "../../types/team";

export async function getTeamMembers(): Promise<TeamMember[]> {
  return teamData.map((member) => {
    const memberSlug = slug(member.name);

    return {
      ...member,
      slug: memberSlug,
      image: import(`../../assets/team/${memberSlug}.png`),
    };
  });
}
