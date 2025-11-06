import os
import subprocess
import re
from collections import defaultdict

paths = [
    p for p in subprocess.check_output(['git', 'ls-files']).decode().splitlines()
    if not p.startswith('.firebase/')
    and p not in {
        'functions/tsconfig.build.tsbuildinfo',
        'packages/shared/tsconfig.tsbuildinfo',
        'functions/tsconfig.build.tsbuildinfo',
        'packages/shared/tsconfig.tsbuildinfo',
    }
    and not p.endswith('.log')
    and p != 'content.html'
]

class Node:
    def __init__(self, name, path, is_dir):
        self.name = name
        self.path = path
        self.is_dir = is_dir
        self.children = []
        self.files = []

root = Node('.', '', True)
nodes = {'': root}

for path in paths:
    parts = path.split('/')
    for i in range(len(parts)):
        sub_path = '/'.join(parts[:i])
        if sub_path not in nodes:
            parent_path = '/'.join(parts[:i-1]) if i > 0 else ''
            parent = nodes[parent_path]
            name = parts[i-1] if i > 0 else '.'
            node = Node(name, sub_path, True)
            nodes[sub_path] = node
            parent.children.append(node)
    dir_path = '/'.join(parts[:-1])
    file_name = parts[-1]
    parent = nodes[dir_path]
    parent.files.append(file_name)

# Sort children and files
for node in nodes.values():
    node.children.sort(key=lambda n: n.name)
    node.files.sort()

image_exts = {'.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico'}

special_file_descriptions = {
    '.firebaserc': 'Firebase project selector that tells the CLI which Firebase project to target during deploys. It keeps environment-specific aliases.',
    '.gitignore': 'Git ignore rules that exclude build artifacts, dependencies, and environment files from version control. It keeps the repository clean of generated content.',
    'Overview.md': 'High-level overview document summarizing the monorepo and its structure. It gives newcomers a quick orientation.',
    'README.md': 'Primary repository README with setup instructions, commands, and project summary details. It guides developers working on the monorepo.',
    'TOP-X Project Summary.markdown': 'Narrative summary of the TOP-X project, including goals and structure descriptions. It captures contextual background for the codebase.',
    'cors.json': 'Firebase Hosting configuration for CORS rules used during emulation or deployment. It ensures proper cross-origin access for hosted functions.',
    'firebase.json': 'Firebase project configuration specifying hosting, functions, and rewrites. It drives Firebase CLI deployments for the monorepo.',
    'firestore.indexes.json': 'Firestore composite index definitions required for queries. Firebase uses this file to manage indexes during deploy.',
    'firestore.rules': 'Firestore security rules controlling access to database resources. They enforce backend security for the app.',
    'profile.png': 'Top-level image asset representing the default profile image for marketing or documentation. It can be referenced in various contexts.',
    'project-structure.txt': 'Text outline describing parts of the project structure. It serves as quick reference for contributors.',
    'temp.txt': 'Temporary note file currently stored in the repository. It likely holds scratch information.',
    'folder_tree.txt': 'Existing folder tree overview listing directories and files. It offers a snapshot of the repo layout.',
    'top-x-shared-1.0.0.tgz': 'Archived tarball of the shared package distribution. It can be used for offline installs or references.',
}

special_dir_descriptions = {
    'apps': 'Directory housing the frontend applications in the monorepo, including the client and admin Vue apps.',
    'apps/admin': 'Admin SPA workspace built with Vite and Vue 3. It provides management tools for games and content.',
    'apps/admin/public': 'Public static assets served by the admin Vite build. It includes icons and other resources.',
    'apps/admin/src': 'Source code for the admin Vue application, including components, layouts, pages, and routing.',
    'apps/admin/src/assets': 'Static assets packaged with the admin app, such as logos or icons.',
    'apps/admin/src/components': 'Reusable Vue components for the admin app UI, covering content management and game editors.',
    'apps/admin/src/components/content': 'Components dedicated to managing CMS content inside the admin experience.',
    'apps/admin/src/components/games': 'Admin-side components for creating and editing available games and daily challenges.',
    'apps/admin/src/layouts': 'Layout shells that wrap admin pages with navigation and common structure.',
    'apps/admin/src/pages': 'Route-level Vue pages for the admin application, each representing a management view.',
    'apps/admin/src/router': 'Routing logic and guards for the admin SPA, enforcing authentication.',
    'apps/admin/src/stores': 'Pinia stores that manage shared state in the admin interface.',
    'apps/client': 'Player-facing client application workspace built with Vite and Vue 3.',
    'apps/client/public': 'Public directory for the client app containing static assets served as-is.',
    'apps/client/public/assets': 'Collection of public assets like sprites, images, and metadata used by the games.',
    'apps/client/public/images': 'Additional public imagery for the client application, often duplicated for compatibility.',
    'apps/client/src': 'Source code for the client Vue application, including games, components, stores, and styles.',
    'apps/client/src/assets': 'Bundled static assets used by the client SPA during runtime.',
    'apps/client/src/components': 'Vue components used throughout the client experience, from layout to games.',
    'apps/client/src/components/build': 'Components powering the Build section where users suggest or assemble games.',
    'apps/client/src/components/games': 'Client-side game implementations and shared UI for each mini-game.',
    'apps/client/src/components/games/FisherGame': 'Components dedicated to the fishing-themed mini-game experience.',
    'apps/client/src/components/games/pacman': 'Pacman-inspired game implementation pieces for the client.',
    'apps/client/src/components/games/pyramid': 'Components supporting the pyramid ranking game and its UI.',
    'apps/client/src/components/games/trivia': 'Components handling trivia gameplay and question flow.',
    'apps/client/src/components/games/zonereveal': 'Zone reveal mini-game components, including tests.',
    'apps/client/src/locales': 'Internationalization resource files for the client application.',
    'apps/client/src/services': 'TypeScript modules for interacting with backend services like leaderboards and trivia.',
    'apps/client/src/stores': 'Pinia stores maintaining client-side state for users, trivia, and locale.',
    'apps/client/src/styles': 'CSS stylesheets defining the design tokens and layouts for the client UI.',
    'apps/client/src/types': 'Type declaration shims used by the client build.',
    'apps/client/src/views': 'Route-level views for the client SPA, including main sections and game shells.',
    'apps/client/src/views/games': 'View wrappers that host the playable mini-games in the client app.',
    'functions': 'Firebase Cloud Functions workspace handling backend logic for the platform.',
    'functions/src': 'TypeScript source for Cloud Functions handlers, utilities, and external integrations.',
    'functions/src/handlers': 'HTTP callable and REST handlers implementing backend operations.',
    'functions/src/utils': 'Utility modules shared across Cloud Functions, including Firebase admin helpers.',
    'functions/lib': 'Compiled type definitions generated from the Cloud Functions TypeScript build.',
    'packages': 'Reusable packages shared across the monorepo, including shared UI and utilities.',
    'packages/shared': 'The @top-x/shared package containing common types, Firebase setup, and Vue components.',
    'packages/shared/src': 'Source for the shared package, including APIs, components, and utilities.',
    'packages/shared/src/api': 'Shared API helper modules that abstract Firestore interactions.',
    'packages/shared/src/components': 'Reusable Vue components provided by the shared package.',
    'packages/shared/src/content': 'Default content configuration exported by the shared package.',
    'packages/shared/src/types': 'TypeScript type definitions shared across apps for games and content.',
    'packages/shared/src/utils': 'Utility helpers used across apps, such as analytics and formatting.',
    'packages/vite-plugin-prerender': 'Custom Vite plugin package for prerendering routes.',
}


def humanize(name: str) -> str:
    name = re.sub(r'[-_]', ' ', name)
    name = re.sub(r'(?<!^)(?=[A-Z])', ' ', name)
    return ' '.join(word.capitalize() for word in name.split())


def describe_directory(path: str) -> str:
    if path in special_dir_descriptions:
        return special_dir_descriptions[path]
    if not path:
        return 'Root of the repository containing all project workspaces and configuration.'
    last = path.split('/')[-1]
    return f"Directory grouping the {humanize(last)} resources within the project structure."


def describe_file(full_path: str, base: str) -> str:
    if base in special_file_descriptions:
        return special_file_descriptions[base]
    ext = os.path.splitext(base)[1].lower()
    if ext in image_exts:
        context = 'client' if 'apps/client' in full_path else 'admin' if 'apps/admin' in full_path else 'shared'
        return (f"Static image asset '{base}' used by the {context} application for visual presentation."
                f" It is bundled with the project's assets for runtime use.")
    if ext == '.gif':
        return (f"Animated image asset '{base}' that provides motion graphics for the client experience."
                f" It loads directly from the assets folder.")
    if ext == '.css':
        comp = humanize(os.path.splitext(base)[0])
        scope = 'admin' if 'apps/admin' in full_path else 'client'
        return (f"CSS stylesheet defining the look and feel for the {comp} component or layout in the {scope} app."
                f" It captures theme and layout rules consumed by the Vue components.")
    if base.endswith('.vue'):
        comp = humanize(os.path.splitext(base)[0])
        app = 'admin' if 'apps/admin' in full_path else 'client'
        return (f"Vue 3 single-file component implementing the {comp} interface in the {app} application."
                f" It encapsulates template, script, and style logic for that feature.")
    if ext == '.tsx':
        comp = humanize(os.path.splitext(base)[0])
        return (f"TypeScript JSX component implementing the {comp} view logic within the admin tools."
                f" It combines strongly typed React-style code to support the surrounding Vue integration.")
    if ext == '.ts':
        name = humanize(os.path.splitext(base)[0])
        lower = name.lower()
        if '/stores/' in full_path:
            app = 'admin' if 'apps/admin' in full_path else 'client'
            return (f"TypeScript Pinia store module managing {lower} state for the {app} app."
                    f" It centralizes reactive data and actions for related features.")
        if '/router/' in full_path:
            app = 'admin' if 'apps/admin' in full_path else 'client'
            return (f"TypeScript router logic configuring navigation for the {app} application."
                    f" It defines routes and guards to control page access.")
        if '/services/' in full_path:
            return (f"TypeScript service module providing {lower} operations for the client app."
                    f" It wraps Firebase or API calls for reuse across components.")
        if '/utils/' in full_path:
            return (f"TypeScript utility module supplying {lower} helpers."
                    f" It offers reusable logic shared across the codebase.")
        if '/components/' in full_path and 'Scene' in base:
            return (f"TypeScript scene implementation powering the {name} mini-game using Phaser."
                    f" It contains the game loop, assets, and gameplay logic for that experience.")
        if '/components/' in full_path:
            return (f"TypeScript helper for the {name} component."
                    f" It supports the surrounding Vue component with strongly typed logic.")
        if '/types/' in full_path:
            return (f"TypeScript type definitions for {lower} data structures."
                    f" They ensure consistent typing across the project.")
        if '/api/' in full_path:
            return (f"TypeScript API helper exposing {lower} operations for shared consumption."
                    f" It abstracts Firestore or HTTP calls behind a simple interface.")
        if '/functions/' in full_path or full_path.startswith('functions/'):
            return (f"TypeScript source file for Firebase Functions handling {lower} behavior."
                    f" It executes backend logic when deployed to Cloud Functions.")
        return (f"General TypeScript module related to {lower} functionality."
                f" It contributes typed logic to the project.")
    if base.endswith('.d.ts'):
        name = humanize(os.path.splitext(os.path.splitext(base)[0])[0])
        return (f"TypeScript declaration file describing the interfaces for {name.lower()}."
                f" It allows TypeScript-aware tooling to understand the module's types.")
    if ext == '.json':
        if base == 'package.json':
            workspace = 'admin app' if 'apps/admin' in full_path else 'client app' if 'apps/client' in full_path else 'functions workspace' if full_path.startswith('functions/') else 'shared package' if 'packages/shared' in full_path else 'plugin package' if 'vite-plugin-prerender' in full_path else 'root workspace'
            return (f"Package manifest for the {workspace}, listing dependencies, scripts, and metadata."
                    f" It is consumed by npm during installs and builds.")
        if base == 'package-lock.json':
            workspace = 'functions workspace' if full_path.startswith('functions/') else 'root workspace'
            return (f"Lockfile preserving resolved dependency versions for the {workspace}."
                    f" It ensures repeatable installs for collaborators.")
        if base.startswith('tsconfig'):
            return (f"TypeScript configuration file {base} that tunes compiler options for its workspace."
                    f" It directs how TypeScript sources are transpiled.")
        return (f"JSON data file '{base}' providing configuration or structured content for the project."
                f" It is read at build or runtime as needed.")
    if base.endswith('.lock'):
        return (f"Lockfile preserving resolved dependency versions for npm installs."
                f" It ensures repeatable builds for this workspace.")
    if ext == '.js':
        name = humanize(os.path.splitext(base)[0])
        return (f"JavaScript module implementing {name.lower()} functionality."
                f" It can run in Node.js as part of build or tooling scripts.")
    if ext == '.txt':
        return (f"Plain text file '{base}' capturing notes or structured references for the project."
                f" It assists contributors with supplemental information.")
    if ext == '.tgz':
        return (f"Tarball archive '{base}' containing a packaged distribution."
                f" It can be used to install the module without fetching from npm.")
    if base.startswith('.'):
        return (f"Configuration or metadata file '{base}' supporting tooling in the repository."
                f" It customizes behavior for this project.")
    return (f"File '{base}' contributing to the project."
            f" It should be consulted within its directory for specific usage.")


def write_node(node: Node, prefix: str, is_last: bool, lines: list):
    if node is not root:
        connector = '└── ' if is_last else '├── '
        desc = describe_directory(node.path)
        lines.append(f"{prefix}{connector}{node.name} — {desc}")
        prefix += '    ' if is_last else '│   '
    else:
        desc = describe_directory(node.path)
        lines.append(f". — {desc}")

    total_children = len(node.children) + len(node.files)
    for idx, child in enumerate(node.children):
        last = (idx == total_children - 1) if not node.files else False
        write_node(child, prefix, last and not node.files, lines)

    for idx, file_name in enumerate(node.files):
        connector = '└── ' if idx == len(node.files) - 1 else '├── '
        full_path = f"{node.path}/{file_name}" if node.path else file_name
        desc = describe_file(full_path, file_name)
        lines.append(f"{prefix}{connector}{file_name} — {desc}")

lines = []
write_node(root, '', True, lines)

with open('project_file_tree_with_descriptions.txt', 'w') as f:
    f.write('\n'.join(lines))
