# Admin Features Documentation

This document details the administrative features available to subreddit moderators in Debate Dueler, including content management, user oversight, and game administration tools.

## Overview

Debate Dueler provides comprehensive admin tools for moderators to:

- **Content Management**: Create, edit, and delete questions
- **User Oversight**: Monitor player activity and manage content
- **Game Administration**: Control game settings and moderate submissions
- **Analytics**: View statistics and player engagement metrics

## Admin Access Control

### Permission Verification

Admin status is determined by subreddit moderator permissions:

```typescript
const permissions = await user?.getModPermissionsForSubreddit(subredditName);
const isAdmin = permissions && permissions.length > 0;
```

**Requirements**:
- Must be a moderator of the subreddit
- Verified through Reddit API on each request
- Admin status cached during session but re-verified for sensitive operations

### Admin Interface Access

**Conditional Rendering**:
```typescript
{isAdmin && (
  <button onClick={goToAdminScreen}>
    Admin Panel
  </button>
)}
```

**Access Points**:
- Results screen: "Go to Admin" button
- Automatic admin status detection
- Secure admin-only routes and operations

## Admin Screen Interface

### Main Admin Dashboard

**Location**: `src/client/components/adminScreen.tsx`

**Features**:
- Deck overview with question statistics
- Player activity metrics
- Quick access to management tools
- Real-time updates after changes

**Layout**:
```
┌─────────────────────────────────────┐
│           Admin Dashboard           │
├─────────────────────────────────────┤
│ Question Management                 │
│ • View all questions                │
│ • Edit existing questions           │
│ • Delete inappropriate content      │
│ • Add new questions                 │
├─────────────────────────────────────┤
│ Player Statistics                   │
│ • Total players                     │
│ • Completion rates                  │
│ • Popular questions                 │
├─────────────────────────────────────┤
│ Moderation Queue                    │
│ • Pending questions                 │
│ • Reported content                  │
└─────────────────────────────────────┘
```

## Question Management

### Viewing Questions

**Interface Features**:
- Paginated question list
- Question statistics display
- Author information
- Creation timestamps
- Popularity metrics

**Question Card Display**:
```
Question: "What is the capital of France?"
Author: u/moderator_user
Created: 2024-01-15 14:30
Answers: 1,247 players
Cards:
• Paris (87% selected)
• London (8% selected)
• Berlin (3% selected)
• Rome (2% selected)
```

### Editing Questions

**Edit Capabilities**:
- Modify question prompt
- Change answer options
- Update time limits
- Adjust question type (multiple choice ↔ sequence)
- Mark correct answers (trivia mode)

**Edit Workflow**:
1. Select question from list
2. Open edit modal/form
3. Make changes with live preview
4. Save changes to server
5. Automatic UI refresh

**Validation**:
- Required fields checking
- Minimum answer options (2+)
- Time limit validation (5-60 seconds)
- Content appropriateness checks

### Deleting Questions

**Deletion Process**:
1. Confirm deletion intent
2. Check for active games using the question
3. Remove from deck and statistics
4. Update all affected player sessions
5. Log deletion for audit trail

**Safety Measures**:
- Confirmation dialogs
- Soft delete option (mark as inactive)
- Impact assessment before deletion
- Recovery options for accidental deletions

### Adding Questions

**Manual Question Creation**:
- Full question builder interface
- Support for all question types
- Rich text formatting
- Image/media support (future)
- Question templates

**Bulk Import**:
- CSV upload functionality
- Question set templates
- Validation and preview
- Batch processing

## Community Content Moderation

### User-Generated Questions

**Submission Process**:
1. Player creates question during gameplay
2. Automatic content filtering
3. Queue for moderator review
4. Approval/rejection workflow

**Review Interface**:
```
Pending Question Review
Question: "What's your favorite programming language?"
Submitted by: u/coder123
Cards: Python, JavaScript, Java, C++
Action: [Approve] [Reject] [Edit]
```

### Content Filtering

**Automated Filters**:
- Profanity detection
- Spam pattern recognition
- Duplicate content checking
- Question quality scoring

**Manual Review Criteria**:
- Appropriateness for subreddit
- Question clarity and quality
- Answer option balance
- Educational value

### Moderation Queue

**Queue Management**:
- Priority-based sorting
- Bulk approval/rejection
- Custom rejection reasons
- User notification system

## Analytics and Reporting

### Player Statistics

**Dashboard Metrics**:
- Total unique players
- Average completion time
- Scoring mode distribution
- Popular questions and answers

**Detailed Analytics**:
```typescript
interface AdminStats {
  totalPlayers: number;
  totalGames: number;
  averageScore: number;
  completionRate: number;
  popularQuestions: QuestionStats[];
  scoringModeBreakdown: Record<ScoringMode, number>;
  playerRetention: number;
  peakActivityHours: number[];
}
```

### Question Performance

**Performance Metrics**:
- Answer distribution analysis
- Question difficulty assessment
- Player engagement scores
- Time spent per question

**Optimization Insights**:
- Questions with low engagement
- Imbalanced answer distributions
- High abandonment rates
- Popular vs unpopular content

### Leaderboard Management

**Admin Controls**:
- Reset leaderboards
- Remove inappropriate entries
- Adjust scoring weights
- Tournament mode setup

## Game Administration

### Deck Management

**Deck Operations**:
- Create new decks
- Clone existing decks
- Archive old decks
- Deck version control

**Deck Settings**:
```typescript
interface DeckSettings {
  title: string;
  description: string;
  theme: string;
  questionLimit: number;
  timeBonusEnabled: boolean;
  communityQuestionsAllowed: boolean;
  autoShuffleQuestions: boolean;
}
```

### Game Configuration

**Global Settings**:
- Default time limits
- Scoring mode availability
- Community contribution settings
- Leaderboard display options

**Per-Post Settings**:
- Custom deck selection
- Game duration limits
- Player participation rules
- Result sharing options

## Security and Safety

### Admin Action Logging

**Audit Trail**:
```typescript
interface AdminAction {
  adminUserId: string;
  action: 'create' | 'edit' | 'delete' | 'approve' | 'reject';
  targetType: 'question' | 'deck' | 'user';
  targetId: string;
  timestamp: number;
  details: any;
  ipAddress?: string;
}
```

**Logged Operations**:
- All question modifications
- User permission changes
- Content moderation actions
- System configuration changes

### Rate Limiting

**Admin Action Limits**:
- Question edits: 100 per hour
- Bulk operations: 50 items per batch
- API calls: 1000 per hour per admin

**Protection Against**:
- Accidental mass deletions
- Spam moderation actions
- API abuse

### Data Backup and Recovery

**Backup Strategy**:
- Automatic daily backups
- Manual backup before major changes
- Version history for questions
- Recovery procedures for data loss

## User Management

### Player Oversight

**Player Monitoring**:
- Individual player statistics
- Game history and patterns
- Reported user tracking
- Ban/mute capabilities

**Player Actions**:
- View player profiles
- Reset player progress
- Remove player data
- Contact players through Reddit

### Content Moderation

**Moderation Tools**:
- Flag inappropriate content
- Hide questions from public view
- User warning system
- Temporary bans for rule violations

## Advanced Features

### Bulk Operations

**Batch Processing**:
```typescript
interface BulkOperation {
  operation: 'approve' | 'reject' | 'delete' | 'edit';
  targetIds: string[];
  parameters?: any;
  confirmationRequired: boolean;
}
```

**Supported Operations**:
- Bulk question approval
- Mass deletion of spam
- Category-based edits
- Template application

### Automation Rules

**Auto-Moderation**:
- Automatic spam detection
- Quality score thresholds
- Duplicate content prevention
- User behavior pattern analysis

**Scheduled Tasks**:
- Daily statistics reports
- Old content cleanup
- Leaderboard resets
- Maintenance operations

## Integration Features

### Reddit API Integration

**Moderator Tools**:
- Direct Reddit messaging
- User flagging and reporting
- Subreddit rule enforcement
- Integration with Reddit's mod tools

### External Services

**Analytics Integration**:
- Google Analytics for user behavior
- Custom event tracking
- Performance monitoring
- Error reporting systems

## Mobile Admin Interface

**Responsive Design**:
- Mobile-optimized admin panels
- Touch-friendly controls
- Swipe gestures for quick actions
- Offline capability for critical operations

## Future Enhancements

### Advanced Analytics

**Planned Features**:
- Player segmentation and targeting
- A/B testing for question variants
- Predictive analytics for content performance
- Machine learning for content moderation

### Collaboration Tools

**Team Features**:
- Multiple moderator support
- Change approval workflows
- Collaborative content creation
- Moderator activity dashboard

### API Access

**Admin API**:
- RESTful API for third-party tools
- Webhook support for real-time updates
- Integration with external moderation services
- Programmatic content management

This comprehensive admin system ensures moderators have full control over their Debate Dueler games while maintaining a positive, engaging experience for all players.