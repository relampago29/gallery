import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("./public/list");
}
