# GitHub Actions Docker Workflow

This directory contains GitHub Actions workflows for automating Docker builds and deployments.

## Docker Build and Push Workflow

The `docker-build-push.yml` workflow automatically builds and pushes Docker images to Docker Hub.

### Features

- **Multi-platform builds**: Builds for both `linux/amd64` and `linux/arm64`
- **Automatic tagging**: Creates multiple tags based on Git references
- **Caching**: Uses GitHub Actions cache to speed up builds
- **Pull request testing**: Builds (but doesn't push) on pull requests
- **Docker Hub sync**: Automatically updates Docker Hub repository description

### Triggers

The workflow runs on:
- Push to `main` or `master` branch
- Push of version tags (e.g., `v1.0.0`)
- Pull requests to `main` or `master` branch
- Manual workflow dispatch

### Tag Strategy

The workflow automatically creates the following tags:

| Git Event | Docker Tags |
|-----------|-------------|
| Push to main/master | `latest`, `main`, `main-<sha>` |
| Push tag `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` |
| Pull request #123 | `pr-123` |

### Setup Instructions

#### 1. Create Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security** → **Access Tokens**
3. Click **New Access Token**
4. Name it (e.g., `github-actions`)
5. Set permissions to **Read, Write, Delete**
6. Copy the generated token (you won't see it again!)

#### 2. Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username (e.g., `baalz3ro`) |
| `DOCKERHUB_TOKEN` | The access token you created in step 1 |

#### 3. Verify Docker Hub Repository

Ensure your Docker Hub repository exists:
- Repository: `baalz3ro/d3-buidl-bot`
- URL: https://hub.docker.com/repository/docker/baalz3ro/d3-buidl-bot

If it doesn't exist, the first push will create it automatically.

#### 4. Test the Workflow

Option A: Push to main branch
```bash
git add .
git commit -m "Add Docker CI workflow"
git push origin main
```

Option B: Create a version tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

Option C: Manually trigger workflow
1. Go to **Actions** tab in GitHub
2. Select **Docker Build and Push** workflow
3. Click **Run workflow**

### Monitoring

- View workflow runs in the **Actions** tab of your GitHub repository
- Check Docker Hub for pushed images: https://hub.docker.com/repository/docker/baalz3ro/d3-buidl-bot/tags

### Troubleshooting

**Build fails with authentication error:**
- Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Ensure the access token has write permissions
- Check if the token has expired

**Build is slow:**
- The first build will take longer as it sets up the cache
- Subsequent builds should be faster using GitHub Actions cache

**Multi-platform build fails:**
- This is usually a dependency issue with a specific architecture
- Check the build logs for architecture-specific errors
- You can temporarily disable one platform in the workflow if needed

### Advanced Configuration

#### Change Docker Image Name

Edit `docker-build-push.yml` and modify the `DOCKER_IMAGE` environment variable:

```yaml
env:
  DOCKER_IMAGE: your-username/your-repo-name
```

#### Add Custom Tags

Add custom tags in the `tags:` section of the metadata step:

```yaml
tags: |
  type=raw,value=custom-tag
  type=ref,event=branch
  # ... existing tags
```

#### Build Single Platform

To build for a single platform only, modify the platforms in the build step:

```yaml
platforms: linux/amd64
```

### Files in This Setup

- `.github/workflows/docker-build-push.yml` - Main workflow file
- `Dockerfile` - Docker image definition
- `.dockerignore` - Files excluded from Docker build context

### Resources

- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Docker Metadata Action](https://github.com/docker/metadata-action)
- [Docker Hub](https://hub.docker.com/)