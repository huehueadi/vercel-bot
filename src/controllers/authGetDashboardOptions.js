// This route can be used to fetch different options for user and admin
export const getDashboardOptions = (req, res) => {
  const { role } = req.user; // This comes from JWT payload

  if (role === "admin") {
    return res.status(200).json({
      success: true,
      options: [
        { name: "Dashboards", link: "/admin/dashboard" },
        { name: "Users", link: "/admin/users" },
        { name: "Chat Logs", link: "/admin/chat-logs" },
        { name: "Roles", link: "/admin/roles" },
      ],
    });
  } else if (role === "user") {
    return res.status(200).json({
      success: true,
      options: [
        { name: "Dashboards", link: "/dashboard" },
        { name: "Get ChatBot", link: "/get-chatbot" },
        { name: "Chats", link: "/chats" },
        { name: "Analytics", link: "/analytics" },
        { name: "Train Agent", link: "/training" },
        { name: "Leads", link: "/leads" },
        { name: "User feedback", link: "/user-feedback" },
      ],
    });
  } else {
    return res.status(403).json({
      success: false,
      message: "Role not recognized.",
    });
  }
};
