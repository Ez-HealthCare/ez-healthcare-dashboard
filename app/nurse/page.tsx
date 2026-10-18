import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
export default function NurseEntry() {
  redirect(ROUTES.NURSE);
}
