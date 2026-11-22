import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_STARTER_CODE = {
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b;
    if (cin >> a >> b) {
        cout << (a + b) << "\\n";
    }
    return 0;
}
`,
    python: `import sys

def solve():
    data = sys.stdin.read().strip().split()
    if len(data) >= 2:
        print(int(data[0]) + int(data[1]))

if __name__ == "__main__":
    solve()
`,
    java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLong()) {
            long a = sc.nextLong();
            long b = sc.nextLong();
            System.out.println(a + b);
        }
    }
}
`,
    javascript: `const fs = require('fs');

function solve() {
    const parts = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
    if (parts.length >= 2) {
        console.log(Number(parts[0]) + Number(parts[1]));
    }
}

solve();
`,
};

const DEFAULT_REFERENCE_CPP = `#include <iostream>
using namespace std;

int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << (a + b) << "\\n";
    }
    return 0;
}
`;

async function main() {
    const problems = await prisma.problem.findMany({
        include: { testCases: true },
    });

    for (const p of problems) {
        await prisma.problem.update({
            where: { id: p.id },
            data: {
                statement:
                    p.statement ||
                    `### ${p.title}\n\nGiven two integers \`a\` and \`b\`, print their sum \`a + b\`.`,
                starterCode: p.starterCode ?? DEFAULT_STARTER_CODE,
                referenceCode: p.referenceCode ?? DEFAULT_REFERENCE_CPP,
                referenceLang: p.referenceLang ?? 'cpp',
            },
        });

        if (p.testCases.length === 0) {
            await prisma.testCase.createMany({
                data: [
                    {
                        problemId: p.id,
                        input: '2 3\n',
                        expectedOutput: '5\n',
                        isSample: true,
                        order: 1,
                    },
                    {
                        problemId: p.id,
                        input: '-4 10\n',
                        expectedOutput: '6\n',
                        isSample: true,
                        order: 2,
                    },
                    {
                        problemId: p.id,
                        input: '100 250\n',
                        expectedOutput: '350\n',
                        isSample: false,
                        order: 3,
                    },
                ],
            });
        }
    }

    console.log(`Seeded/verified ${problems.length} problems.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });