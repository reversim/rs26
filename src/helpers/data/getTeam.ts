import slug from "slug";
import type { TeamMember } from "../../types/team";

export async function getTeamMembers(): Promise<TeamMember[]> {
  const baseUrl = "https://rs-backoffice.vercel.app/api/users";
  const yearId = "206e7341-e20f-4ad8-9ca3-c03134165f7f";
  
  const url = `${baseUrl}?yearId=${yearId}`;
  const response = await fetch(url);
  const data = (await response.json()) as TeamMember[];

  return data
    .filter((member) => {
      // Filter out members without a name or picture
      return member.name && member.picture;
    })
    .map((member) => ({
      ...member,
      slug: member.slug || slug(member.name),
    }));
}
