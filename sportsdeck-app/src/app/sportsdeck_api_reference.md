# SportsDeck API Reference

## Social and Community

| Method | Endpoint                              | Description                                              |
| ------ | ------------------------------------- | -------------------------------------------------------- |
| GET    | `/api/users/:id`                      | Get public user profile                                  |
| GET    | `/api/users/:id/followers`            | List a user's followers                                  |
| GET    | `/api/users/:id/following`            | List users a user follows                                |
| GET    | `/api/users/:id/activity`             | Get user activity chart data                             |
| POST   | `/api/follow/:userId`                 | Follow a user                                            |
| DELETE | `/api/follow/:userId`                 | Unfollow a user                                          |
| GET    | `/api/users/me/following`             | Get users the current user is following                  |
| GET    | `/api/users/me/followers`             | Get current user's followers                             |
| DELETE | `/api/users/me/followers/:followerId` | Remove a follower from the current user's followers list |
| GET    | `/api/feed`                           | Get personalized user feed                               |
| PATCH  | `/api/feed/:id/read`                  | Mark a feed item as read                                 |

------------------------------------------------------------------------

## Forums and Discussions

| Method | Endpoint                       | Description                                              |
| ------ | ------------------------------ | -------------------------------------------------------- |
| GET    | `/api/matches/:id/thread`      | Get or auto-create the dedicated match discussion thread |
| POST   | `/api/threads`                 | Create a discussion thread                               |
| GET    | `/api/threads`                 | Browse and search threads                                |
| GET    | `/api/threads/:id`             | Get thread details                                       |
| PATCH  | `/api/threads/:id`             | Edit a thread                                            |
| DELETE | `/api/threads/:id`             | Soft-delete a thread                                     |
| GET    | `/api/threads/:id/full`        | Get full thread page data in one request                 |
| GET    | `/api/threads/:id/posts`       | Get posts in a thread                                    |
| POST   | `/api/threads/:id/posts`      | Create a post in a thread                                |
| PATCH  | `/api/posts/:id`               | Edit a post                                              |
| DELETE | `/api/posts/:id`               | Delete a post                                            |
| GET    | `/api/posts/:id/versions`      | Get post edit history                                    |
| GET    | `/api/posts/:id/replies`       | Get replies for a post                                   |
| POST   | `/api/posts/:id/replies`      | Create a reply to a post                                 |
| PATCH  | `/api/replies/:id`             | Edit a reply                                             |
| DELETE | `/api/replies/:id`             | Delete a reply                                           |
| GET    | `/api/replies/:id/versions`    | Get reply edit history                                   |
| POST   | `/api/threads/:id/poll`        | Create a poll for a thread                               |
| GET    | `/api/polls/:id`               | Get poll details                                         |
| PATCH  | `/api/polls/:id`               | Edit a poll                                              |
| DELETE | `/api/polls/:id`               | Delete a poll                                            |
| POST   | `/api/polls/:id/options`       | Add options to a poll                                    |
| POST   | `/api/polls/:id/vote`          | Vote in a poll                                           |
| GET    | `/api/polls/:id/results`       | Get poll results                                         |

------------------------------------------------------------------------

## Accounts

API TABLE

------------------------------------------------------------------------

## Matches

API TABLE

------------------------------------------------------------------------

## Moderation

API TABLE

------------------------------------------------------------------------

## AI-powered Enhancements

API TABLE
