export const ATLAS_WORKFLOW_V0_8_SPEC = `openapi: 3.0.3
info:
  title: Atlas Workflow API
  version: 0.8.0
  description: Initial Core Launch of Atlas Workflow API with Auth and Users.
servers:
  - url: https://api.atlas-workflow.example.com/v1
tags:
  - name: Auth
  - name: Users
paths:
  /auth/login:
    post:
      tags: [Auth]
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /users/me:
    get:
      tags: [Users]
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users:
    get:
      tags: [Users]
      operationId: listUsers
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string, format: password }
    AuthResponse:
      type: object
      required: [accessToken, tokenType, expiresIn]
      properties:
        accessToken: { type: string }
        tokenType: { type: string }
        expiresIn: { type: integer }
    User:
      type: object
      required: [id, email, name, role, createdAt]
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
        role: { type: string, enum: [admin, member, guest] }
        createdAt: { type: string, format: date-time }
    UserList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total: { type: integer }
`;

export const ATLAS_WORKFLOW_V0_9_SPEC = `openapi: 3.0.3
info:
  title: Atlas Workflow API
  version: 0.9.0
  description: Teams and Projects release of Atlas Workflow API.
servers:
  - url: https://api.atlas-workflow.example.com/v1
tags:
  - name: Auth
  - name: Users
  - name: Teams
  - name: Projects
paths:
  /auth/login:
    post:
      tags: [Auth]
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/refresh:
    post:
      tags: [Auth]
      operationId: refreshToken
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /users/me:
    get:
      tags: [Users]
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users:
    get:
      tags: [Users]
      operationId: listUsers
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
    post:
      tags: [Users]
      operationId: createUser
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /teams:
    get:
      tags: [Teams]
      operationId: listTeams
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of teams
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TeamList'
    post:
      tags: [Teams]
      operationId: createTeam
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTeamRequest'
      responses:
        '201':
          description: Team created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Team'
  /teams/{teamId}:
    get:
      tags: [Teams]
      operationId: getTeam
      security:
        - BearerAuth: []
      parameters:
        - name: teamId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Team details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Team'
  /projects:
    get:
      tags: [Projects]
      operationId: listProjects
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectList'
    post:
      tags: [Projects]
      operationId: createProject
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
      responses:
        '201':
          description: Project created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
  /projects/{projectId}:
    get:
      tags: [Projects]
      operationId: getProject
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Project details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string, format: password }
    AuthResponse:
      type: object
      required: [accessToken, tokenType, expiresIn]
      properties:
        accessToken: { type: string }
        tokenType: { type: string }
        expiresIn: { type: integer }
    User:
      type: object
      required: [id, email, name, role, createdAt]
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
        role: { type: string, enum: [admin, member, guest] }
        createdAt: { type: string, format: date-time }
    CreateUserRequest:
      type: object
      required: [email, name, password]
      properties:
        email: { type: string, format: email }
        name: { type: string }
        password: { type: string, format: password }
        role: { type: string, enum: [admin, member, guest], default: member }
    UserList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total: { type: integer }
    Team:
      type: object
      required: [id, name, members, createdAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        members:
          type: array
          items:
            $ref: '#/components/schemas/User'
        createdAt: { type: string, format: date-time }
    CreateTeamRequest:
      type: object
      required: [name]
      properties:
        name: { type: string }
        description: { type: string }
    TeamList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Team'
        total: { type: integer }
    Project:
      type: object
      required: [id, name, team, settings, createdAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        team:
          $ref: '#/components/schemas/Team'
        settings:
          $ref: '#/components/schemas/ProjectSettings'
        createdAt: { type: string, format: date-time }
    CreateProjectRequest:
      type: object
      required: [name, teamId]
      properties:
        name: { type: string }
        description: { type: string }
        teamId: { type: string, format: uuid }
    ProjectSettings:
      type: object
      required: [isPublic, notificationsEnabled]
      properties:
        isPublic: { type: boolean, default: false }
        notificationsEnabled: { type: boolean, default: true }
    ProjectList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Project'
        total: { type: integer }
`;

export const ATLAS_WORKFLOW_V0_9_5_SPEC = `openapi: 3.0.3
info:
  title: Atlas Workflow API
  version: 0.9.5
  description: Tasks & Workflow iteration of Atlas Workflow API.
servers:
  - url: https://api.atlas-workflow.example.com/v1
tags:
  - name: Auth
  - name: Users
  - name: Teams
  - name: Projects
  - name: Tasks
paths:
  /auth/login:
    post:
      tags: [Auth]
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/refresh:
    post:
      tags: [Auth]
      operationId: refreshToken
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /users/me:
    get:
      tags: [Users]
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users:
    get:
      tags: [Users]
      operationId: listUsers
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
    post:
      tags: [Users]
      operationId: createUser
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /teams:
    get:
      tags: [Teams]
      operationId: listTeams
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of teams
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TeamList'
    post:
      tags: [Teams]
      operationId: createTeam
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTeamRequest'
      responses:
        '201':
          description: Team created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Team'
  /teams/{teamId}:
    get:
      tags: [Teams]
      operationId: getTeam
      security:
        - BearerAuth: []
      parameters:
        - name: teamId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Team details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Team'
  /projects:
    get:
      tags: [Projects]
      operationId: listProjects
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectList'
    post:
      tags: [Projects]
      operationId: createProject
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
      responses:
        '201':
          description: Project created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
  /projects/{projectId}:
    get:
      tags: [Projects]
      operationId: getProject
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Project details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
  /projects/{projectId}/tasks:
    get:
      tags: [Tasks]
      operationId: listTasks
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: List of tasks
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskList'
    post:
      tags: [Tasks]
      operationId: createTask
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskRequest'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
  /projects/{projectId}/tasks/{taskId}:
    get:
      tags: [Tasks]
      operationId: getTask
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Task details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
    patch:
      tags: [Tasks]
      operationId: updateTask
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTaskRequest'
      responses:
        '200':
          description: Task updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string, format: password }
    AuthResponse:
      type: object
      required: [accessToken, tokenType, expiresIn]
      properties:
        accessToken: { type: string }
        tokenType: { type: string }
        expiresIn: { type: integer }
    User:
      type: object
      required: [id, email, name, role, createdAt]
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
        role: { type: string, enum: [admin, member, guest] }
        createdAt: { type: string, format: date-time }
    CreateUserRequest:
      type: object
      required: [email, name, password]
      properties:
        email: { type: string, format: email }
        name: { type: string }
        password: { type: string, format: password }
        role: { type: string, enum: [admin, member, guest], default: member }
    UserList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total: { type: integer }
    Team:
      type: object
      required: [id, name, members, createdAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        members:
          type: array
          items:
            $ref: '#/components/schemas/User'
        createdAt: { type: string, format: date-time }
    CreateTeamRequest:
      type: object
      required: [name]
      properties:
        name: { type: string }
        description: { type: string }
    TeamList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Team'
        total: { type: integer }
    Project:
      type: object
      required: [id, name, team, settings, createdAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        team:
          $ref: '#/components/schemas/Team'
        settings:
          $ref: '#/components/schemas/ProjectSettings'
        createdAt: { type: string, format: date-time }
    CreateProjectRequest:
      type: object
      required: [name, teamId]
      properties:
        name: { type: string }
        description: { type: string }
        teamId: { type: string, format: uuid }
    ProjectSettings:
      type: object
      required: [isPublic, notificationsEnabled]
      properties:
        isPublic: { type: boolean, default: false }
        notificationsEnabled: { type: boolean, default: true }
    ProjectList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Project'
        total: { type: integer }
    TaskStatus:
      type: string
      enum: [todo, in_progress, review, done]
      default: todo
    Label:
      type: object
      required: [id, name, color]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        color: { type: string }
    Task:
      type: object
      required: [id, title, status, project, assignee, labels, createdAt]
      properties:
        id: { type: string, format: uuid }
        title: { type: string }
        description: { type: string }
        status:
          $ref: '#/components/schemas/TaskStatus'
        project:
          $ref: '#/components/schemas/Project'
        assignee:
          $ref: '#/components/schemas/User'
        labels:
          type: array
          items:
            $ref: '#/components/schemas/Label'
        createdAt: { type: string, format: date-time }
    CreateTaskRequest:
      type: object
      required: [title]
      properties:
        title: { type: string }
        description: { type: string }
        assigneeId: { type: string, format: uuid }
        labelIds:
          type: array
          items: { type: string, format: uuid }
    UpdateTaskRequest:
      type: object
      properties:
        title: { type: string }
        description: { type: string }
        status:
          $ref: '#/components/schemas/TaskStatus'
        assigneeId: { type: string, format: uuid }
        labelIds:
          type: array
          items: { type: string, format: uuid }
    TaskList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Task'
        total: { type: integer }
`;
