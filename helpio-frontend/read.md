hrms-react-vite/
│
├── public/
│   ├── locales/
│   │   ├── en.json
│   │   └── hn.json
│   ├── media/
│   └── local_html/
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── access/
│   │   ├── type/
│   │   │   └── access.enum.ts
│   │   ├── CanIAccess.tsx
│   │   └── CanIAccessWrapper.tsx
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── clients/
│   │   ├── index.ts
│   │   │
│   │   ├── default/
│   │   │   ├── styles/
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   └── global.scss
│   │   │   │
│   │   │   ├── main/
│   │   │   │   └── MainLayout.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── screens/
│   │   │   │       └── dashboard/
│   │   │   │           └── dashboardLayout.tsx
│   │   │   │
│   │   │   ├── employee/
│   │   │   │   └── screens/
│   │   │   │       └── employees/
│   │   │   │           ├── employeesLayout.tsx
│   │   │   │           └── employeesForm.tsx
│   │   │   │
│   │   │   ├── attendance/
│   │   │   │   └── screens/
│   │   │   │       └── attendance/
│   │   │   │           └── attendanceLayout.tsx
│   │   │   │
│   │   │   ├── leaveManagement/
│   │   │   │   └── screens/
│   │   │   │       └── leaves/
│   │   │   │           ├── leavesLayout.tsx
│   │   │   │           └── leavesForm.tsx
│   │   │   │
│   │   │   └── masters/
│   │   │       └── screens/
│   │   │           └── branches/
│   │   │               ├── branchesLayout.tsx
│   │   │               └── branchesForm.tsx
│   │   │
│   │   └── demo/
│   │       ├── styles/
│   │       ├── dashboard/
│   │       ├── login/
│   │       └── main/
│   │
│   ├── common/
│   │   ├── CommonDto.ts
│   │   ├── CommonEnum.ts
│   │   ├── ColumnConfig.tsx
│   │   ├── CommonApi.ts
│   │   └── commonMasterSlaveApi.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── popover.tsx
│   │   │
│   │   ├── pclComponents/
│   │   │   ├── PclButton.tsx
│   │   │   ├── PclPaginatedGrid.tsx
│   │   │   ├── PclDropdown.tsx
│   │   │   ├── PclDatePicker.tsx
│   │   │   ├── PclFileUpload.tsx
│   │   │   ├── PclSwitch.tsx
│   │   │   ├── PclConfirmationModal.tsx
│   │   │   ├── PclTitle.tsx
│   │   │   ├── PclText.tsx
│   │   │   └── showToast.ts
│   │   │
│   │   ├── customs/
│   │   │   └── form/
│   │   │       ├── AppForm.tsx
│   │   │       ├── AppFormItem.tsx
│   │   │       └── useAppForm.ts
│   │   │
│   │   ├── common/
│   │   │   ├── dropdown/
│   │   │   │   ├── BranchDropdown.tsx
│   │   │   │   ├── DepartmentDropdown.tsx
│   │   │   │   ├── EmployeeDropdown.tsx
│   │   │   │   └── RoleDropdown.tsx
│   │   │   ├── ActionMenu.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   └── Timeline.tsx
│   │   │
│   │   └── wrapper/
│   │       ├── SuspenseWrapper.tsx
│   │       ├── CardWrapper.tsx
│   │       ├── TableWrapper.tsx
│   │       └── AuthWrapper.tsx
│   │
│   ├── config/
│   │   ├── base_service/
│   │   │   ├── http.config.ts
│   │   │   └── base.api.ts
│   │   ├── router/
│   │   │   ├── MyRouter.tsx
│   │   │   └── RouterKeys.ts
│   │   ├── keycloak.ts
│   │   ├── i18.ts
│   │   ├── env.config.ts
│   │   └── theme.config.ts
│   │
│   ├── hooks/
│   │   ├── usePageMode.ts
│   │   ├── useTableFilters.ts
│   │   ├── useToggle.ts
│   │   ├── useDocumentUpload.ts
│   │   └── usePincodeStateCity.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── validators.ts
│   │
│   ├── pages/
│   │   ├── login/
│   │   ├── main/
│   │   ├── dashboard/
│   │   ├── employee/
│   │   ├── attendance/
│   │   ├── leaveManagement/
│   │   ├── shiftManagement/
│   │   ├── masters/
│   │   ├── organization/
│   │   ├── manageAccess/
│   │   ├── user/
│   │   ├── workflow/
│   │   └── onboarding/
│   │
│   ├── redux/
│   │   ├── store.ts
│   │   ├── MainSlice.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   │
│   └── types/
│       └── global.d.ts
│
├── .claude/
│   └── skills/
│       └── hrms-conventions/
│           └── SKILL.md
│
├── .env.default
├── .env.demo
├── .env.test
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── firebase.json
├── Jenkinsfile
└── README.md