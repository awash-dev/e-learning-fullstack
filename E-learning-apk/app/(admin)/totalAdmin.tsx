import React from "react";
import UserListScreen from "@/components/UserListScreen";

export default function TotalInstructorScreen() {
  return (
    <UserListScreen
      role="instructor"
      title="All Instructors"
      icon="person-outline"
      color="#f59e0b"
    />
  );
}