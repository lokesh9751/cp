import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function makeStarters(cppBody, pyBody, javaBody, jsBody) {
    return {
        cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

${cppBody}
    return 0;
}
`,
        python: `import sys

def solve():
${pyBody}

if __name__ == "__main__":
    solve()
`,
        java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
${javaBody}
    }
}
`,
        javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf8').trim();
${jsBody}
}

solve();
`,
    };
}

const PROBLEMS_DATA = [
    {
        slug: 'two-sum',
        statement: `Given an array of \`n\` integers \`nums\` and an integer \`target\`, find two distinct indices \`i\` and \`j\` (\`0 <= i < j < n\`) such that \`nums[i] + nums[j] == target\`.

### Input Format
- First line: two integers \`n\` and \`target\`.
- Second line: \`n\` space-separated integers.

### Output Format
Print two space-separated 0-based indices \`i j\` (\`i < j\`). Exactly one valid solution exists.`,
        constraints: `2 <= n <= 10^5\n-10^9 <= nums[i], target <= 10^9`,
        starterCode: makeStarters(
            `    int n;\n    long long target;\n    if (!(cin >> n >> target)) return 0;\n    vector<long long> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    // Print two 0-based indices i j (i < j)\n`,
            `    data = sys.stdin.read().split()\n    if not data:\n        return\n    n, target = int(data[0]), int(data[1])\n    nums = list(map(int, data[2:2+n]))\n    # Print two 0-based indices i j (i < j)\n    pass`,
            `        StringTokenizer st = new StringTokenizer(br.readLine());\n        int n = Integer.parseInt(st.nextToken());\n        long target = Long.parseLong(st.nextToken());\n        // Read array and print i j`,
            `    if (!input) return;\n    const parts = input.split(/\\s+/).map(Number);\n    const [n, target] = parts;\n    const nums = parts.slice(2, 2 + n);\n    // Print two 0-based indices i j (i < j)`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; long long target;
    if (!(cin >> n >> target)) return 0;
    unordered_map<long long, int> seen;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        auto it = seen.find(target - x);
        if (it != seen.end()) {
            cout << it->second << " " << i << "\\n";
            return 0;
        }
        seen[x] = i;
    }
    return 0;
}`,
        testCases: [
            { input: '4 9\n2 7 11 15\n', expectedOutput: '0 1\n', isSample: true, order: 1 },
            { input: '3 6\n3 2 4\n', expectedOutput: '1 2\n', isSample: true, order: 2 },
            { input: '2 6\n3 3\n', expectedOutput: '0 1\n', isSample: false, order: 3 },
            { input: '5 -8\n-1 -2 -3 -4 -5\n', expectedOutput: '2 4\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'reverse-linked-list',
        statement: `Given the head of a singly linked list represented by \`n\` integer values, reverse the list and output the reversed node values.

### Input Format
- First line: integer \`n\` (number of nodes).
- Second line: \`n\` space-separated integers representing the list from head to tail.

### Output Format
Print the \`n\` integers of the reversed list separated by spaces.`,
        constraints: `1 <= n <= 10^5\n-10^9 <= node.val <= 10^9`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<long long> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    // Reverse and print`,
            `    data = sys.stdin.read().split()\n    if not data:\n        return\n    n = int(data[0])\n    arr = data[1:1+n]\n    # Reverse and print\n    pass`,
            `        int n = Integer.parseInt(br.readLine().trim());\n        // Read n values, reverse and print`,
            `    if (!input) return;\n    const parts = input.split(/\\s+/);\n    const n = Number(parts[0]);\n    const arr = parts.slice(1, 1 + n);\n    // Reverse and print`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    reverse(a.begin(), a.end());
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? "\\n" : " ");
    return 0;
}`,
        testCases: [
            { input: '5\n1 2 3 4 5\n', expectedOutput: '5 4 3 2 1\n', isSample: true, order: 1 },
            { input: '2\n1 2\n', expectedOutput: '2 1\n', isSample: true, order: 2 },
            { input: '1\n42\n', expectedOutput: '42\n', isSample: false, order: 3 },
            { input: '4\n-5 0 10 3\n', expectedOutput: '3 10 0 -5\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'longest-increasing-subsequence',
        statement: `Given an integer array \`nums\` of length \`n\`, return the length of the longest **strictly increasing** subsequence.

### Input Format
- First line: integer \`n\`.
- Second line: \`n\` space-separated integers.

### Output Format
Print a single integer: the length of the longest strictly increasing subsequence.`,
        constraints: `1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<long long> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    // Compute LIS length`,
            `    data = list(map(int, sys.stdin.read().split()))\n    if not data:\n        return\n    n, nums = data[0], data[1:1+data[0]]\n    # Compute LIS length\n    pass`,
            `        int n = Integer.parseInt(br.readLine().trim());\n        // Compute LIS length`,
            `    if (!input) return;\n    const parts = input.split(/\\s+/).map(Number);\n    const nums = parts.slice(1, 1 + parts[0]);\n    // Compute LIS length`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> tails;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    cout << tails.size() << "\\n";
    return 0;
}`,
        testCases: [
            { input: '8\n10 9 2 5 3 7 101 18\n', expectedOutput: '4\n', isSample: true, order: 1 },
            { input: '6\n0 1 0 3 2 3\n', expectedOutput: '4\n', isSample: true, order: 2 },
            { input: '7\n7 7 7 7 7 7 7\n', expectedOutput: '1\n', isSample: false, order: 3 },
            { input: '5\n5 4 3 2 1\n', expectedOutput: '1\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'valid-parentheses',
        statement: `Given a string \`s\` containing just the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, and \`]\`, determine if the input string is valid.

Open brackets must be closed by the same type of brackets in the correct order.

### Input Format
A single line containing string \`s\`.

### Output Format
Print \`true\` if valid, otherwise \`false\`.`,
        constraints: `1 <= |s| <= 10^5\ns consists only of ()[]{}`,
        starterCode: makeStarters(
            `    string s;\n    if (!(cin >> s)) return 0;\n    // Print true or false`,
            `    s = sys.stdin.read().strip()\n    # Print true or false\n    pass`,
            `        String s = br.readLine().trim();\n        // Print true or false`,
            `    const s = input;\n    // Print true or false`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    if (!(cin >> s)) return 0;
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.empty()) { cout << "false\\n"; return 0; }
            char t = st.top(); st.pop();
            if ((c == ')' && t != '(') || (c == ']' && t != '[') || (c == '}' && t != '{')) {
                cout << "false\\n"; return 0;
            }
        }
    }
    cout << (st.empty() ? "true" : "false") << "\\n";
    return 0;
}`,
        testCases: [
            { input: '()[]{}\n', expectedOutput: 'true\n', isSample: true, order: 1 },
            { input: '(]\n', expectedOutput: 'false\n', isSample: true, order: 2 },
            { input: '({[]})\n', expectedOutput: 'true\n', isSample: false, order: 3 },
            { input: '([)]\n', expectedOutput: 'false\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'merge-two-sorted-lists',
        statement: `Given two non-decreasing sorted lists of sizes \`n\` and \`m\`, merge them into a single sorted list.

### Input Format
- Line 1: integer \`n\`, followed by \`n\` sorted integers (if \`n > 0\`).
- Next: integer \`m\`, followed by \`m\` sorted integers (if \`m > 0\`).

### Output Format
Print all \`n + m\` integers in sorted order separated by spaces.`,
        constraints: `0 <= n, m <= 10^5\nn + m >= 1\n-10^9 <= val <= 10^9`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<long long> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    int m; cin >> m;\n    vector<long long> b(m);\n    for (int i = 0; i < m; i++) cin >> b[i];\n    // Merge a and b`,
            `    tokens = list(map(int, sys.stdin.read().split()))\n    if not tokens:\n        return\n    n = tokens[0]\n    a = tokens[1:1+n]\n    m = tokens[1+n]\n    b = tokens[2+n:2+n+m]\n    # Merge and print\n    pass`,
            `        // Read n, list a, m, list b and print merged sorted list`,
            `    const tokens = input.split(/\\s+/).map(Number);\n    const n = tokens[0];\n    const a = tokens.slice(1, 1 + n);\n    const m = tokens[1 + n];\n    const b = tokens.slice(2 + n, 2 + n + m);\n    // Merge and print`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int m; cin >> m;
    vector<long long> b(m);
    for (int i = 0; i < m; i++) cin >> b[i];
    vector<long long> res;
    res.reserve(n + m);
    int i = 0, j = 0;
    while (i < n && j < m) res.push_back(a[i] <= b[j] ? a[i++] : b[j++]);
    while (i < n) res.push_back(a[i++]);
    while (j < m) res.push_back(b[j++]);
    for (int k = 0; k < (int)res.size(); k++) cout << res[k] << (k + 1 == (int)res.size() ? "\\n" : " ");
    return 0;
}`,
        testCases: [
            { input: '3\n1 2 4\n3\n1 3 4\n', expectedOutput: '1 1 2 3 4 4\n', isSample: true, order: 1 },
            { input: '0\n1\n0\n', expectedOutput: '0\n', isSample: true, order: 2 },
            { input: '4\n-5 -1 3 10\n3\n-2 0 12\n', expectedOutput: '-5 -2 -1 0 3 10 12\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'binary-tree-level-order-traversal',
        statement: `Given the level-order representation of a binary tree (using \`null\` for missing nodes), output the values level by level from left to right.

### Input Format
- Line 1: integer \`n\` (number of tokens).
- Line 2: \`n\` space-separated tokens (integers or \`null\`).

### Output Format
Print each tree level on a separate line with space-separated node values.`,
        constraints: `1 <= n <= 10^5\n-10^5 <= node.val <= 10^5`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<string> tokens(n);\n    for (int i = 0; i < n; i++) cin >> tokens[i];\n    // Build tree and print each level on a new line`,
            `    data = sys.stdin.read().split()\n    if not data:\n        return\n    n = int(data[0])\n    tokens = data[1:1+n]\n    # Build tree and print each level\n    pass`,
            `        // Read n and tokens, build binary tree and print level order`,
            `    const parts = input.split(/\\s+/);\n    const n = Number(parts[0]);\n    const tokens = parts.slice(1, 1 + n);\n    // Build tree and print each level`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node *l = nullptr, *r = nullptr; Node(int v): val(v) {} };
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<string> t(n);
    for (int i = 0; i < n; i++) cin >> t[i];
    if (n == 0 || t[0] == "null") return 0;
    Node* root = new Node(stoi(t[0]));
    queue<Node*> q; q.push(root);
    int idx = 1;
    while (!q.empty() && idx < n) {
        Node* cur = q.front(); q.pop();
        if (idx < n && t[idx] != "null") { cur->l = new Node(stoi(t[idx])); q.push(cur->l); }
        idx++;
        if (idx < n && t[idx] != "null") { cur->r = new Node(stoi(t[idx])); q.push(cur->r); }
        idx++;
    }
    queue<Node*> bfs; bfs.push(root);
    while (!bfs.empty()) {
        int sz = bfs.size();
        for (int i = 0; i < sz; i++) {
            Node* cur = bfs.front(); bfs.pop();
            cout << cur->val << (i + 1 == sz ? "\\n" : " ");
            if (cur->l) bfs.push(cur->l);
            if (cur->r) bfs.push(cur->r);
        }
    }
    return 0;
}`,
        testCases: [
            { input: '7\n3 9 20 null null 15 7\n', expectedOutput: '3\n9 20\n15 7\n', isSample: true, order: 1 },
            { input: '1\n1\n', expectedOutput: '1\n', isSample: true, order: 2 },
            { input: '5\n1 2 3 4 5\n', expectedOutput: '1\n2 3\n4 5\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'maximum-subarray',
        statement: `Given an integer array \`nums\` of length \`n\`, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.

### Input Format
- Line 1: integer \`n\`.
- Line 2: \`n\` space-separated integers.

### Output Format
Print a single integer: the maximum subarray sum.`,
        constraints: `1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<long long> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    // Print maximum subarray sum`,
            `    data = list(map(int, sys.stdin.read().split()))\n    if not data:\n        return\n    nums = data[1:1+data[0]]\n    # Print maximum subarray sum\n    pass`,
            `        int n = Integer.parseInt(br.readLine().trim());\n        // Print maximum subarray sum`,
            `    const parts = input.split(/\\s+/).map(Number);\n    const nums = parts.slice(1, 1 + parts[0]);\n    // Print maximum subarray sum`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    long long best = LLONG_MIN, cur = 0;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        cur = max(x, cur + x);
        best = max(best, cur);
    }
    cout << best << "\\n";
    return 0;
}`,
        testCases: [
            { input: '9\n-2 1 -3 4 -1 2 1 -5 4\n', expectedOutput: '6\n', isSample: true, order: 1 },
            { input: '1\n1\n', expectedOutput: '1\n', isSample: true, order: 2 },
            { input: '5\n5 4 -1 7 8\n', expectedOutput: '23\n', isSample: false, order: 3 },
            { input: '3\n-3 -1 -2\n', expectedOutput: '-1\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'climbing-stairs',
        statement: `You are climbing a staircase that takes \`n\` steps to reach the top. Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

### Input Format
A single integer \`n\`.

### Output Format
Print a single integer: the number of distinct ways.`,
        constraints: `1 <= n <= 45`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    // Print number of distinct ways`,
            `    n = int(sys.stdin.read().strip())\n    # Print number of distinct ways\n    pass`,
            `        int n = Integer.parseInt(br.readLine().trim());\n        // Print number of distinct ways`,
            `    const n = Number(input);\n    // Print number of distinct ways`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; if (!(cin >> n)) return 0;
    long long a = 1, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b; b = c;
    }
    cout << b << "\\n";
    return 0;
}`,
        testCases: [
            { input: '2\n', expectedOutput: '2\n', isSample: true, order: 1 },
            { input: '3\n', expectedOutput: '3\n', isSample: true, order: 2 },
            { input: '5\n', expectedOutput: '8\n', isSample: false, order: 3 },
            { input: '45\n', expectedOutput: '1836311903\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'number-of-islands',
        statement: `Given an \`r x c\` 2D binary grid where \`1\` represents land and \`0\` represents water, count the number of islands (connected horizontally or vertically).

### Input Format
- Line 1: two integers \`r\` and \`c\`.
- Next \`r\` lines: each a string of length \`c\` containing \`0\` and \`1\`.

### Output Format
Print a single integer: the number of islands.`,
        constraints: `1 <= r, c <= 300`,
        starterCode: makeStarters(
            `    int r, c;\n    if (!(cin >> r >> c)) return 0;\n    vector<string> grid(r);\n    for (int i = 0; i < r; i++) cin >> grid[i];\n    // Count islands`,
            `    lines = sys.stdin.read().splitlines()\n    r, c = map(int, lines[0].split())\n    grid = [list(line.strip()) for line in lines[1:1+r]]\n    # Count islands\n    pass`,
            `        // Read r, c and r grid rows, print island count`,
            `    const lines = input.split(/\\r?\\n/);\n    const [r, c] = lines[0].split(/\\s+/).map(Number);\n    const grid = lines.slice(1, 1 + r).map((row) => row.trim().split(''));\n    // Count islands`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int r, c; if (!(cin >> r >> c)) return 0;
    vector<string> g(r);
    for (int i = 0; i < r; i++) cin >> g[i];
    int ans = 0;
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            if (g[i][j] == '1') {
                ans++;
                queue<pair<int,int>> q;
                q.push({i, j});
                g[i][j] = '0';
                while (!q.empty()) {
                    auto [x, y] = q.front(); q.pop();
                    for (int d = 0; d < 4; d++) {
                        int nx = x + dr[d], ny = y + dc[d];
                        if (nx >= 0 && nx < r && ny >= 0 && ny < c && g[nx][ny] == '1') {
                            g[nx][ny] = '0';
                            q.push({nx, ny});
                        }
                    }
                }
            }
        }
    }
    cout << ans << "\\n";
    return 0;
}`,
        testCases: [
            { input: '4 5\n11110\n11010\n11000\n00000\n', expectedOutput: '1\n', isSample: true, order: 1 },
            { input: '4 5\n11000\n11000\n00100\n00011\n', expectedOutput: '3\n', isSample: true, order: 2 },
            { input: '2 2\n00\n00\n', expectedOutput: '0\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'longest-common-subsequence',
        statement: `Given two strings \`text1\` and \`text2\`, return the length of their longest common subsequence. If there is no common subsequence, print \`0\`.

### Input Format
- Line 1: string \`text1\`.
- Line 2: string \`text2\`.

### Output Format
Print a single integer: the length of the LCS.`,
        constraints: `1 <= |text1|, |text2| <= 1000`,
        starterCode: makeStarters(
            `    string a, b;\n    if (!(cin >> a >> b)) return 0;\n    // Print LCS length`,
            `    a, b = sys.stdin.read().split()\n    # Print LCS length\n    pass`,
            `        String a = br.readLine().trim();\n        String b = br.readLine().trim();\n        // Print LCS length`,
            `    const [a, b] = input.split(/\\s+/);\n    // Print LCS length`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string a, b;
    if (!(cin >> a >> b)) return 0;
    int n = a.size(), m = b.size();
    vector<int> dp(m + 1, 0), ndp(m + 1, 0);
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) ndp[j] = dp[j - 1] + 1;
            else ndp[j] = max(dp[j], ndp[j - 1]);
        }
        swap(dp, ndp);
    }
    cout << dp[m] << "\\n";
    return 0;
}`,
        testCases: [
            { input: 'abcde\nace\n', expectedOutput: '3\n', isSample: true, order: 1 },
            { input: 'abc\nabc\n', expectedOutput: '3\n', isSample: true, order: 2 },
            { input: 'abc\ndef\n', expectedOutput: '0\n', isSample: false, order: 3 },
            { input: 'aggtab\ngxtxayb\n', expectedOutput: '4\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'coin-change',
        statement: `Given \`n\` coin denominations and a target \`amount\`, find the fewest number of coins needed to make up that amount. If it cannot be made up, print \`-1\`.

### Input Format
- Line 1: two integers \`n\` and \`amount\`.
- Line 2: \`n\` space-separated coin values.

### Output Format
Print a single integer: minimum number of coins, or \`-1\`.`,
        constraints: `1 <= n <= 12\n0 <= amount <= 10^4\n1 <= coins[i] <= 10^4`,
        starterCode: makeStarters(
            `    int n, amount;\n    if (!(cin >> n >> amount)) return 0;\n    vector<int> coins(n);\n    for (int i = 0; i < n; i++) cin >> coins[i];\n    // Print min coins or -1`,
            `    data = list(map(int, sys.stdin.read().split()))\n    n, amount = data[0], data[1]\n    coins = data[2:2+n]\n    # Print min coins or -1\n    pass`,
            `        // Read n, amount, and coins; print min coins or -1`,
            `    const parts = input.split(/\\s+/).map(Number);\n    const [n, amount] = parts;\n    const coins = parts.slice(2, 2 + n);\n    // Print min coins or -1`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, amount;
    if (!(cin >> n >> amount)) return 0;
    vector<int> coins(n);
    for (int i = 0; i < n; i++) cin >> coins[i];
    const int INF = 1e9;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int c : coins) {
        for (int a = c; a <= amount; a++) {
            dp[a] = min(dp[a], dp[a - c] + 1);
        }
    }
    cout << (dp[amount] >= INF ? -1 : dp[amount]) << "\\n";
    return 0;
}`,
        testCases: [
            { input: '3 11\n1 2 5\n', expectedOutput: '3\n', isSample: true, order: 1 },
            { input: '1 3\n2\n', expectedOutput: '-1\n', isSample: true, order: 2 },
            { input: '1 0\n1\n', expectedOutput: '0\n', isSample: false, order: 3 },
            { input: '4 27\n2 5 10 1\n', expectedOutput: '4\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'course-schedule',
        statement: `There are \`numCourses\` courses labeled \`0\` to \`numCourses - 1\` and \`m\` prerequisite pairs \`a b\` meaning you must take course \`b\` before course \`a\`. Determine if it is possible to finish all courses.

### Input Format
- Line 1: two integers \`numCourses\` and \`m\`.
- Next \`m\` lines: two integers \`a b\`.

### Output Format
Print \`true\` if all courses can be finished, otherwise \`false\`.`,
        constraints: `1 <= numCourses <= 10^5\n0 <= m <= 10^5`,
        starterCode: makeStarters(
            `    int n, m;\n    if (!(cin >> n >> m)) return 0;\n    // Read m pairs (a, b) and print true or false`,
            `    data = list(map(int, sys.stdin.read().split()))\n    n, m = data[0], data[1]\n    # Detect cycle and print true or false\n    pass`,
            `        // Read numCourses, m, and prerequisites; print true or false`,
            `    const parts = input.split(/\\s+/).map(Number);\n    const [n, m] = parts;\n    // Print true or false`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m; if (!(cin >> n >> m)) return 0;
    vector<vector<int>> adj(n);
    vector<int> indeg(n, 0);
    for (int i = 0; i < m; i++) {
        int a, b; cin >> a >> b;
        adj[b].push_back(a);
        indeg[a]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    int visited = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        visited++;
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    cout << (visited == n ? "true" : "false") << "\\n";
    return 0;
}`,
        testCases: [
            { input: '2 1\n1 0\n', expectedOutput: 'true\n', isSample: true, order: 1 },
            { input: '2 2\n1 0\n0 1\n', expectedOutput: 'false\n', isSample: true, order: 2 },
            { input: '4 3\n1 0\n2 1\n3 2\n', expectedOutput: 'true\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'word-break',
        statement: `Given a string \`s\` and a dictionary of \`k\` words, determine if \`s\` can be segmented into a space-separated sequence of one or more dictionary words. Words may be reused.

### Input Format
- Line 1: string \`s\`.
- Line 2: integer \`k\`.
- Line 3: \`k\` space-separated dictionary words.

### Output Format
Print \`true\` if \`s\` can be segmented, otherwise \`false\`.`,
        constraints: `1 <= |s| <= 300\n1 <= k <= 1000`,
        starterCode: makeStarters(
            `    string s; int k;\n    if (!(cin >> s >> k)) return 0;\n    vector<string> dict(k);\n    for (int i = 0; i < k; i++) cin >> dict[i];\n    // Print true or false`,
            `    tokens = sys.stdin.read().split()\n    s, k = tokens[0], int(tokens[1])\n    words = set(tokens[2:2+k])\n    # Print true or false\n    pass`,
            `        // Read s, k, dictionary words and print true or false`,
            `    const tokens = input.split(/\\s+/);\n    const s = tokens[0], k = Number(tokens[1]);\n    const words = new Set(tokens.slice(2, 2 + k));\n    // Print true or false`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; int k;
    if (!(cin >> s >> k)) return 0;
    unordered_set<string> dict;
    for (int i = 0; i < k; i++) { string w; cin >> w; dict.insert(w); }
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && dict.count(s.substr(j, i - j))) {
                dp[i] = true; break;
            }
        }
    }
    cout << (dp[n] ? "true" : "false") << "\\n";
    return 0;
}`,
        testCases: [
            { input: 'leetcode\n2\nleet code\n', expectedOutput: 'true\n', isSample: true, order: 1 },
            { input: 'applepenapple\n2\napple pen\n', expectedOutput: 'true\n', isSample: true, order: 2 },
            { input: 'catsandog\n5\ncats dog sand and cat\n', expectedOutput: 'false\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'trapping-rain-water',
        statement: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

### Input Format
- Line 1: integer \`n\`.
- Line 2: \`n\` space-separated non-negative integers.

### Output Format
Print a single integer: total units of trapped water.`,
        constraints: `1 <= n <= 10^5\n0 <= height[i] <= 10^5`,
        starterCode: makeStarters(
            `    int n;\n    if (!(cin >> n)) return 0;\n    vector<long long> h(n);\n    for (int i = 0; i < n; i++) cin >> h[i];\n    // Print trapped water`,
            `    data = list(map(int, sys.stdin.read().split()))\n    h = data[1:1+data[0]]\n    # Print trapped water\n    pass`,
            `        // Read n and heights, print total trapped water`,
            `    const parts = input.split(/\\s+/).map(Number);\n    const h = parts.slice(1, 1 + parts[0]);\n    // Print trapped water`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<long long> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int l = 0, r = n - 1;
    long long lmax = 0, rmax = 0, ans = 0;
    while (l <= r) {
        if (h[l] <= h[r]) {
            lmax = max(lmax, h[l]);
            ans += lmax - h[l++];
        } else {
            rmax = max(rmax, h[r]);
            ans += rmax - h[r--];
        }
    }
    cout << ans << "\\n";
    return 0;
}`,
        testCases: [
            { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1\n', expectedOutput: '6\n', isSample: true, order: 1 },
            { input: '6\n4 2 0 3 2 5\n', expectedOutput: '9\n', isSample: true, order: 2 },
            { input: '3\n3 2 1\n', expectedOutput: '0\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'median-of-two-sorted-arrays',
        statement: `Given two sorted arrays \`nums1\` (size \`n\`) and \`nums2\` (size \`m\`), find the median of the two sorted arrays in \`O(log(min(n, m)))\` time.

### Input Format
- \`n\` followed by \`n\` sorted integers (if \`n > 0\`).
- \`m\` followed by \`m\` sorted integers (if \`m > 0\`).

### Output Format
Print the median rounded to **5 decimal places** (e.g., \`2.50000\`).`,
        constraints: `0 <= n, m <= 10^5\nn + m >= 1\n-10^6 <= nums[i] <= 10^6`,
        starterCode: makeStarters(
            `    int n; if (!(cin >> n)) return 0;\n    vector<int> a(n); for (int i = 0; i < n; i++) cin >> a[i];\n    int m; cin >> m;\n    vector<int> b(m); for (int i = 0; i < m; i++) cin >> b[i];\n    // Print median with fixed setprecision(5)`,
            `    tokens = list(map(int, sys.stdin.read().split()))\n    n = tokens[0]\n    a = tokens[1:1+n]\n    m = tokens[1+n]\n    b = tokens[2+n:2+n+m]\n    # Print median formatted as f"{ans:.5f}"\n    pass`,
            `        // Read a and b, print median formatted to 5 decimal places`,
            `    const tokens = input.split(/\\s+/).map(Number);\n    const n = tokens[0], a = tokens.slice(1, 1 + n);\n    const m = tokens[1 + n], b = tokens.slice(2 + n, 2 + n + m);\n    // Print ans.toFixed(5)`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; if (!(cin >> n)) return 0;
    vector<int> a(n); for (int i = 0; i < n; i++) cin >> a[i];
    int m; cin >> m;
    vector<int> b(m); for (int i = 0; i < m; i++) cin >> b[i];
    if (a.size() > b.size()) swap(a, b);
    int x = a.size(), y = b.size();
    int lo = 0, hi = x;
    while (lo <= hi) {
        int px = (lo + hi) / 2;
        int py = (x + y + 1) / 2 - px;
        int maxLX = (px == 0) ? INT_MIN : a[px - 1];
        int minRX = (px == x) ? INT_MAX : a[px];
        int maxLY = (py == 0) ? INT_MIN : b[py - 1];
        int minRY = (py == y) ? INT_MAX : b[py];
        if (maxLX <= minRY && maxLY <= minRX) {
            double ans = ((x + y) % 2 == 0)
                ? (max(maxLX, maxLY) + min(minRX, minRY)) / 2.0
                : (double)max(maxLX, maxLY);
            cout << fixed << setprecision(5) << ans << "\\n";
            return 0;
        } else if (maxLX > minRY) hi = px - 1;
        else lo = px + 1;
    }
    return 0;
}`,
        testCases: [
            { input: '2\n1 3\n1\n2\n', expectedOutput: '2.00000\n', isSample: true, order: 1 },
            { input: '2\n1 2\n2\n3 4\n', expectedOutput: '2.50000\n', isSample: true, order: 2 },
            { input: '0\n1\n7\n', expectedOutput: '7.00000\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'regular-expression-matching',
        statement: `Given an input string \`s\` and a pattern \`p\`, implement regular expression matching with support for \`.\` (matches any single character) and \`*\` (matches zero or more of the preceding element). The match must cover the entire string \`s\`.

### Input Format
- Line 1: string \`s\`.
- Line 2: pattern \`p\`.

### Output Format
Print \`true\` if \`s\` matches \`p\`, otherwise \`false\`.`,
        constraints: `1 <= |s|, |p| <= 30`,
        starterCode: makeStarters(
            `    string s, p;\n    if (!(cin >> s >> p)) return 0;\n    // Print true or false`,
            `    s, p = sys.stdin.read().split()\n    # Print true or false\n    pass`,
            `        String s = br.readLine().trim();\n        String p = br.readLine().trim();\n        // Print true or false`,
            `    const [s, p] = input.split(/\\s+/);\n    // Print true or false`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s, p;
    if (!(cin >> s >> p)) return 0;
    int n = s.size(), m = p.size();
    vector<vector<bool>> dp(n + 1, vector<bool>(m + 1, false));
    dp[0][0] = true;
    for (int j = 2; j <= m; j++) {
        if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (p[j - 1] == '*') {
                dp[i][j] = dp[i][j - 2] || ((p[j - 2] == '.' || p[j - 2] == s[i - 1]) && dp[i - 1][j]);
            } else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    }
    cout << (dp[n][m] ? "true" : "false") << "\\n";
    return 0;
}`,
        testCases: [
            { input: 'aa\na\n', expectedOutput: 'false\n', isSample: true, order: 1 },
            { input: 'aa\na*\n', expectedOutput: 'true\n', isSample: true, order: 2 },
            { input: 'ab\n.*\n', expectedOutput: 'true\n', isSample: false, order: 3 },
            { input: 'aab\nc*a*b\n', expectedOutput: 'true\n', isSample: false, order: 4 },
        ],
    },
    {
        slug: 'merge-k-sorted-lists',
        statement: `Given \`k\` sorted linked lists, merge all of them into one sorted list and print the elements.

### Input Format
- Line 1: integer \`k\`.
- Next \`k\` lines: each line starts with \`len\` followed by \`len\` sorted integers.

### Output Format
Print all merged integers in non-decreasing order separated by spaces.`,
        constraints: `1 <= k <= 10^4\nTotal elements <= 10^5`,
        starterCode: makeStarters(
            `    int k; if (!(cin >> k)) return 0;\n    // Read k sorted lists and print merged output`,
            `    tokens = list(map(int, sys.stdin.read().split()))\n    # Parse k lists and print merged sorted output\n    pass`,
            `        // Read k sorted lists and print merged sorted output`,
            `    const tokens = input.split(/\\s+/).map(Number);\n    // Parse k lists and print merged sorted output`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int k; if (!(cin >> k)) return 0;
    vector<long long> all;
    for (int i = 0; i < k; i++) {
        int len; cin >> len;
        for (int j = 0; j < len; j++) {
            long long x; cin >> x;
            all.push_back(x);
        }
    }
    sort(all.begin(), all.end());
    for (int i = 0; i < (int)all.size(); i++) {
        cout << all[i] << (i + 1 == (int)all.size() ? "\\n" : " ");
    }
    return 0;
}`,
        testCases: [
            { input: '3\n3 1 4 5\n3 1 3 4\n2 2 6\n', expectedOutput: '1 1 2 3 4 4 5 6\n', isSample: true, order: 1 },
            { input: '2\n2 1 5\n2 2 3\n', expectedOutput: '1 2 3 5\n', isSample: true, order: 2 },
            { input: '3\n0\n1 10\n2 -3 4\n', expectedOutput: '-3 4 10\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'maximum-flow-edmonds-karp',
        statement: `Given a directed flow network with \`n\` vertices (1-indexed), \`m\` directed edges with non-negative capacities, source \`s\`, and sink \`t\`, compute the maximum flow from \`s\` to \`t\`.

### Input Format
- Line 1: four integers \`n m s t\`.
- Next \`m\` lines: three integers \`u v cap\`.

### Output Format
Print a single integer: the maximum flow from \`s\` to \`t\`.`,
        constraints: `2 <= n <= 500\n1 <= m <= 5000\n0 <= cap <= 10^9`,
        starterCode: makeStarters(
            `    int n, m, s, t;\n    if (!(cin >> n >> m >> s >> t)) return 0;\n    // Compute max flow from s to t`,
            `    data = list(map(int, sys.stdin.read().split()))\n    n, m, s, t = data[:4]\n    # Compute max flow\n    pass`,
            `        // Read n, m, s, t and edges; print max flow`,
            `    const data = input.split(/\\s+/).map(Number);\n    const [n, m, s, t] = data;\n    // Compute max flow`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m, s, t;
    if (!(cin >> n >> m >> s >> t)) return 0;
    vector<vector<long long>> cap(n + 1, vector<long long>(n + 1, 0));
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v; long long c;
        cin >> u >> v >> c;
        if (cap[u][v] == 0 && cap[v][u] == 0) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
        cap[u][v] += c;
    }
    long long flow = 0;
    vector<int> parent(n + 1);
    while (true) {
        fill(parent.begin(), parent.end(), -1);
        parent[s] = -2;
        queue<pair<int, long long>> q;
        q.push({s, LLONG_MAX});
        long long pushed = 0;
        while (!q.empty()) {
            auto [cur, f] = q.front(); q.pop();
            for (int nxt : adj[cur]) {
                if (parent[nxt] == -1 && cap[cur][nxt] > 0) {
                    parent[nxt] = cur;
                    long long nf = min(f, cap[cur][nxt]);
                    if (nxt == t) { pushed = nf; break; }
                    q.push({nxt, nf});
                }
            }
            if (pushed > 0) break;
        }
        if (pushed == 0) break;
        flow += pushed;
        int cur = t;
        while (cur != s) {
            int prev = parent[cur];
            cap[prev][cur] -= pushed;
            cap[cur][prev] += pushed;
            cur = prev;
        }
    }
    cout << flow << "\\n";
    return 0;
}`,
        testCases: [
            { input: '4 5 1 4\n1 2 3\n1 3 2\n2 3 1\n2 4 2\n3 4 3\n', expectedOutput: '5\n', isSample: true, order: 1 },
            { input: '2 1 1 2\n1 2 10\n', expectedOutput: '10\n', isSample: true, order: 2 },
            { input: '3 1 1 3\n1 2 5\n', expectedOutput: '0\n', isSample: false, order: 3 },
        ],
    },
    {
        slug: 'segment-tree-with-lazy-propagation',
        statement: `Maintain an array of \`n\` integers (1-indexed) and process \`q\` queries:
- \`1 l r val\`: add \`val\` to every element in \`[l, r]\`.
- \`2 l r\`: output the sum of elements in \`[l, r]\`.

### Input Format
- Line 1: two integers \`n\` and \`q\`.
- Line 2: \`n\` initial integers.
- Next \`q\` lines: queries of type \`1\` or \`2\`.

### Output Format
For each type \`2\` query, print the range sum on a new line.`,
        constraints: `1 <= n, q <= 10^5\n-10^9 <= a[i], val <= 10^9`,
        starterCode: makeStarters(
            `    int n, q;\n    if (!(cin >> n >> q)) return 0;\n    // Implement Segment Tree with Lazy Propagation`,
            `    data = list(map(int, sys.stdin.read().split()))\n    n, q = data[0], data[1]\n    # Implement Segment Tree with Lazy Propagation\n    pass`,
            `        // Implement Segment Tree with Lazy Propagation`,
            `    const data = input.split(/\\s+/).map(Number);\n    // Implement Segment Tree with Lazy Propagation`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int n;
vector<long long> tree, lazy, arr;
void build(int node, int l, int r) {
    if (l == r) { tree[node] = arr[l]; return; }
    int m = (l + r) / 2;
    build(node * 2, l, m);
    build(node * 2 + 1, m + 1, r);
    tree[node] = tree[node * 2] + tree[node * 2 + 1];
}
void push(int node, int l, int r) {
    if (lazy[node] != 0) {
        int m = (l + r) / 2;
        tree[node * 2] += lazy[node] * (m - l + 1);
        lazy[node * 2] += lazy[node];
        tree[node * 2 + 1] += lazy[node] * (r - m);
        lazy[node * 2 + 1] += lazy[node];
        lazy[node] = 0;
    }
}
void update(int node, int l, int r, int ql, int qr, long long val) {
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) {
        tree[node] += val * (r - l + 1);
        lazy[node] += val;
        return;
    }
    push(node, l, r);
    int m = (l + r) / 2;
    update(node * 2, l, m, ql, qr, val);
    update(node * 2 + 1, m + 1, r, ql, qr, val);
    tree[node] = tree[node * 2] + tree[node * 2 + 1];
}
long long query(int node, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return 0;
    if (ql <= l && r <= qr) return tree[node];
    push(node, l, r);
    int m = (l + r) / 2;
    return query(node * 2, l, m, ql, qr) + query(node * 2 + 1, m + 1, r, ql, qr);
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int q; if (!(cin >> n >> q)) return 0;
    arr.assign(n + 1, 0);
    for (int i = 1; i <= n; i++) cin >> arr[i];
    tree.assign(4 * n + 5, 0);
    lazy.assign(4 * n + 5, 0);
    build(1, 1, n);
    while (q--) {
        int type, l, r; cin >> type >> l >> r;
        if (type == 1) { long long val; cin >> val; update(1, 1, n, l, r, val); }
        else cout << query(1, 1, n, l, r) << "\\n";
    }
    return 0;
}`,
        testCases: [
            { input: '5 4\n1 2 3 4 5\n2 1 5\n1 2 4 3\n2 1 5\n2 2 3\n', expectedOutput: '15\n24\n11\n', isSample: true, order: 1 },
            { input: '3 3\n0 0 0\n1 1 3 5\n1 2 2 -2\n2 1 3\n', expectedOutput: '13\n', isSample: true, order: 2 },
        ],
    },
    {
        slug: 'dijkstra-shortest-path',
        statement: `Given a directed weighted graph with \`n\` vertices (1-indexed), \`m\` edges with non-negative weights, and a source vertex \`s\`, find the shortest path distance from \`s\` to every vertex \`1..n\`. Print \`-1\` for unreachable vertices.

### Input Format
- Line 1: three integers \`n m s\`.
- Next \`m\` lines: three integers \`u v w\` (directed edge \`u -> v\` with weight \`w\`).

### Output Format
Print \`n\` space-separated integers: shortest distance from \`s\` to \`1, 2, ..., n\`.`,
        constraints: `1 <= n <= 10^5\n0 <= m <= 2 * 10^5\n0 <= w <= 10^9`,
        starterCode: makeStarters(
            `    int n, m, s;\n    if (!(cin >> n >> m >> s)) return 0;\n    // Run Dijkstra from s and print n distances`,
            `    data = list(map(int, sys.stdin.read().split()))\n    n, m, s = data[:3]\n    # Run Dijkstra from s\n    pass`,
            `        // Read n, m, s and edges; print shortest distances`,
            `    const data = input.split(/\\s+/).map(Number);\n    const [n, m, s] = data;\n    // Run Dijkstra from s`
        ),
        referenceCode: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m, s;
    if (!(cin >> n >> m >> s)) return 0;
    vector<vector<pair<int, long long>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v; long long w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }
    const long long INF = LLONG_MAX / 4;
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[s] = 0;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    for (int i = 1; i <= n; i++) {
        cout << (dist[i] == INF ? -1 : dist[i]) << (i == n ? "\\n" : " ");
    }
    return 0;
}`,
        testCases: [
            { input: '4 5 1\n1 2 1\n1 3 4\n2 3 2\n2 4 6\n3 4 3\n', expectedOutput: '0 1 3 6\n', isSample: true, order: 1 },
            { input: '3 1 1\n1 2 5\n', expectedOutput: '0 5 -1\n', isSample: true, order: 2 },
            { input: '3 3 2\n2 1 2\n1 3 3\n2 3 10\n', expectedOutput: '2 0 5\n', isSample: false, order: 3 },
        ],
    },
];

async function main() {
    let updated = 0;

    for (const item of PROBLEMS_DATA) {
        const existing = await prisma.problem.findUnique({ where: { slug: item.slug } });
        if (!existing) {
            console.warn(`Skipped (not found in DB): ${item.slug}`);
            continue;
        }

        await prisma.$transaction(async (tx) => {
            await tx.problem.update({
                where: { id: existing.id },
                data: {
                    statement: item.statement,
                    constraints: item.constraints,
                    examples: null,
                    starterCode: item.starterCode,
                    referenceCode: item.referenceCode,
                    referenceLang: 'cpp',
                },
            });

            await tx.testCase.deleteMany({ where: { problemId: existing.id } });
            await tx.testCase.createMany({
                data: item.testCases.map((tc) => ({
                    problemId: existing.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isSample: tc.isSample,
                    order: tc.order,
                })),
            });
        });

        updated++;
    }

    // Promote your dev account to ADMIN so you can access /admin/problems next
    const adminEmail = 'dio75611@gmail.com';
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (adminUser && adminUser.role !== 'ADMIN') {
        await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'ADMIN' },
        });
        console.log(`Promoted ${adminEmail} to ADMIN.`);
    }

    console.log(`Updated ${updated} / ${PROBLEMS_DATA.length} problems with real statements & test cases.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });