# UserList Component

A real-time user list component that displays all users with their online/offline status.

## Features

- Fetches all users from the API on mount
- Connects to WebSocket server for real-time status updates
- Displays user avatar, name, and online status indicator
- Visual distinction: green badge and dot for online users
- Responsive design for mobile and desktop
- Click handler to select users
- Filters out the current user from the list

## Usage

```tsx
import { UserList } from "@/components/UserList"

function ChatPage() {
  const [selectedUser, setSelectedUser] = useState(null)

  return (
    <UserList
      onSelectUser={setSelectedUser}
      selectedUserId={selectedUser?.id}
    />
  )
}
```

## Props

- `onSelectUser`: Callback function called when a user is clicked
- `selectedUserId`: Optional ID of the currently selected user (for highlighting)

## Dependencies

- shadcn/ui components: Avatar, Badge, ScrollArea
- Socket.io client for WebSocket connection
- NextAuth for session management

## WebSocket Events

The component listens to the following WebSocket events:

- `users:online`: Initial list of online users
- `user:online`: User comes online
- `user:offline`: User goes offline

## API Endpoints

- `GET /api/users`: Fetches all users
- `GET /api/socket/token`: Gets JWT token for WebSocket authentication
