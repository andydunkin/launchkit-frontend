/**
 * Frontend message parsing utilities
 * Hide code blocks and technical details to improve user experience
 */

export interface ParsedMessage {
  content: string;
  hasCode: boolean;
  filesGenerated: string[];
  deploymentStatus?: 'deploying' | 'deployed' | 'failed';
}

export interface CodeParsingOptions {
  hideCodeBlocks: boolean;
  hideFileMarkers: boolean;
  showTechnicalDetails: boolean;
  userType: 'beginner' | 'developer' | 'admin';
}

const DEFAULT_OPTIONS: CodeParsingOptions = {
  hideCodeBlocks: true,
  hideFileMarkers: true,
  showTechnicalDetails: false,
  userType: 'beginner'
};

/**
 * Main message parser - processes AI responses to hide code and improve UX
 */
export function parseMessage(content: string, options: Partial<CodeParsingOptions> = {}): ParsedMessage {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let processedContent = content;
  let hasCode = false;
  let filesGenerated: string[] = [];

  // Detect deployment status from content
  const deploymentStatus = detectDeploymentStatus(content);

  // 1. Parse file markers first
  if (opts.hideFileMarkers) {
    const fileParseResult = parseFileMarkers(processedContent);
    processedContent = fileParseResult.content;
    filesGenerated = fileParseResult.files;
    if (filesGenerated.length > 0) hasCode = true;
  }

  // 2. Handle code blocks
  if (opts.hideCodeBlocks) {
    const codeParseResult = hideCodeBlocks(processedContent, opts.userType, deploymentStatus);
    processedContent = codeParseResult.content;
    if (codeParseResult.hadCode) hasCode = true;
  }

  // 3. Clean up extra whitespace
  processedContent = cleanWhitespace(processedContent);

  // 4. Add enhancement based on deployment status
  if (deploymentStatus && hasCode) {
    processedContent = enhanceWithDeploymentStatus(processedContent, deploymentStatus, filesGenerated.length);
  }

  return {
    content: processedContent,
    hasCode,
    filesGenerated,
    deploymentStatus
  };
}

/**
 * Parse file markers and replace with user-friendly file summary
 */
function parseFileMarkers(content: string): { content: string; files: string[] } {
  const filePattern = /!~\*FILENAME:(.+?)\*~!([\s\S]*?)!~\*ENDFILE:\1\*~!/g;
  const files: string[] = [];
  let match;

  // Extract file information
  while ((match = filePattern.exec(content)) !== null) {
    const filename = match[1].trim();
    const fileContent = match[2];
    const lines = fileContent.split('\n').filter(line => line.trim()).length;
    
    files.push(`${filename} (${lines} lines)`);
  }

  // Remove file markers from content
  let processedContent = content.replace(filePattern, '');

  // Add file summary if files were found
  if (files.length > 0) {
    const fileList = files.map(file => `• ${file}`).join('\n');
    processedContent += `\n\n📁 **Generated Files:**\n${fileList}`;
  }

  return { content: processedContent, files };
}

/**
 * Hide code blocks and replace with user-friendly messages
 */
function hideCodeBlocks(content: string, userType: 'beginner' | 'developer' | 'admin', deploymentStatus?: string): { content: string; hadCode: boolean } {
  const codeBlockPattern = /```[\s\S]*?```/g;
  const hadCode = codeBlockPattern.test(content);

  if (!hadCode) {
    return { content, hadCode: false };
  }

  let replacement: string;

  if (userType === 'developer') {
    // Developers might want to see code - make it collapsible
    replacement = '💻 *Code generated and deployed* <details><summary>Show technical details</summary>$&</details>';
  } else if (deploymentStatus === 'deployed') {
    // App is deployed - focus on success
    replacement = '✅ **Code generated successfully** - Your app is ready to use!';
  } else if (deploymentStatus === 'deploying') {
    // Currently deploying
    replacement = '🚀 **Deploying your code...** - This will take a moment';
  } else {
    // Default: hide code with simple message
    replacement = '💻 **App code generated** - Building your application...';
  }

  const processedContent = content.replace(codeBlockPattern, replacement);
  return { content: processedContent, hadCode: true };
}

/**
 * Detect deployment status from message content
 */
function detectDeploymentStatus(content: string): 'deploying' | 'deployed' | 'failed' | undefined {
  const deployedKeywords = [
    'Your app is live',
    'app is live at',
    'deployed successfully',
    'deployment complete'
  ];

  const deployingKeywords = [
    'deploying',
    'building',
    'Creating deployment',
    'Deployment in progress'
  ];

  const failedKeywords = [
    'deployment failed',
    'build failed',
    'Deployment Issue',
    'Deployment Error'
  ];

  const lowerContent = content.toLowerCase();

  if (failedKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
    return 'failed';
  }

  if (deployedKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
    return 'deployed';
  }

  if (deployingKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
    return 'deploying';
  }

  return undefined;
}

/**
 * Enhance message with deployment status information
 */
function enhanceWithDeploymentStatus(content: string, status: string, fileCount: number): string {
  switch (status) {
    case 'deployed':
      if (fileCount > 1) {
        return content + `\n\n🎉 **Multi-file application deployed successfully!**\nYour ${fileCount}-file app is now live and ready to use.`;
      } else {
        return content + `\n\n🎉 **Application deployed successfully!**\nYour app is now live and ready to use.`;
      }
    
    case 'deploying':
      return content + `\n\n⏳ **Deployment in progress...**\nYour app will be ready shortly.`;
    
    case 'failed':
      return content + `\n\n❌ **Deployment encountered issues**\nI'll help you fix this and redeploy.`;
    
    default:
      return content;
  }
}

/**
 * Clean up extra whitespace and formatting
 */
function cleanWhitespace(content: string): string {
  return content
    .replace(/\n{4,}/g, '\n\n\n')  // Max 3 consecutive newlines
    .replace(/^\s+|\s+$/g, '')     // Trim start/end
    .replace(/[ \t]+$/gm, '');     // Remove trailing spaces
}

/**
 * Create user-friendly summary for technical content
 */
export function createTechnicalSummary(content: string): string {
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
  const fileMarkers = (content.match(/!~\*FILENAME:/g) || []).length;
  
  if (fileMarkers > 0) {
    return `📋 Generated ${fileMarkers} files with complete app structure`;
  } else if (codeBlocks > 0) {
    return `💻 Generated ${codeBlocks} code ${codeBlocks === 1 ? 'component' : 'components'}`;
  }
  
  return '';
}

/**
 * Extract app URL from content if present
 */
export function extractAppUrl(content: string): string | null {
  const urlPattern = /https:\/\/app-[a-f0-9]{8}\.launchkit\.stratxi\.com/;
  const match = content.match(urlPattern);
  return match ? match[0] : null;
}

/**
 * Check if message indicates successful deployment
 */
export function isDeploymentSuccess(content: string): boolean {
  const successIndicators = [
    'Your app is live',
    'deployed successfully',
    'deployment complete',
    '🚀 Your app is live at'
  ];
  
  return successIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Generate contextual placeholder text based on conversation state
 */
export function getContextualPlaceholder(
  messageCount: number, 
  hasDeployedApp: boolean,
  lastMessageHadCode: boolean
): string {
  if (messageCount === 0) {
    return "Describe the app you'd like to build...";
  } else if (lastMessageHadCode && !hasDeployedApp) {
    return "Make any changes or ask me to deploy it!";
  } else if (hasDeployedApp) {
    return "What would you like to update or add?";
  } else {
    return "Continue describing your app or ask me to build it...";
  }
}