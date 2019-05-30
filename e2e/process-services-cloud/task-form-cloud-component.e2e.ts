/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { browser } from 'protractor';
import { AppListCloudPage, StringUtil, ApiService, LoginSSOPage, TasksService, QueryService,
    ProcessDefinitionsService, ProcessInstancesService, SettingsPage } from '@alfresco/adf-testing';
import { NavigationBarPage } from '../pages/adf/navigationBarPage';
import { TasksCloudDemoPage } from '../pages/adf/demo-shell/process-services/tasksCloudDemoPage';
import { TaskDetailsCloudDemoPage } from '../pages/adf/demo-shell/process-services/taskDetailsCloudDemoPage';

import resources = require('../util/resources');

describe('Task form cloud component ', () => {

    const loginSSOPage = new LoginSSOPage();
    const navigationBarPage = new NavigationBarPage();
    const appListCloudComponent = new AppListCloudPage();
    const tasksCloudDemoPage = new TasksCloudDemoPage();
    const taskDetailsCloudDemoPage = new TaskDetailsCloudDemoPage();
    const settingsPage = new SettingsPage();

    let tasksService: TasksService;
    let processDefinitionService: ProcessDefinitionsService;
    let processInstancesService: ProcessInstancesService;
    let queryService: QueryService;

    let createdTask;
    let assigneeTask;
    let toBeCompletedTask;
    let completedProcess;
    let claimedTask;
    let candidateGroupProcess;
    let assigneeUserTask;
    let candidateGroupTask;
    const candidateuserapp = resources.ACTIVITI7_APPS.CANDIDATE_USER_APP.name;
    const simpleApp = resources.ACTIVITI7_APPS.SIMPLE_APP.name;
    const completedTaskName = StringUtil.generateRandomString(), assignedTaskName = StringUtil.generateRandomString();

    beforeAll(async (done) => {
        const apiService = new ApiService(browser.params.config.oauth2.clientId, browser.params.config.bpmHost, browser.params.config.oauth2.host, browser.params.config.providers);
        await apiService.login(browser.params.identityUser.email, browser.params.identityUser.password);

        processDefinitionService = new ProcessDefinitionsService(apiService);
        processInstancesService = new ProcessInstancesService(apiService);
        queryService = new QueryService(apiService);
        tasksService = new TasksService(apiService);

        createdTask = await tasksService.createStandaloneTask(StringUtil.generateRandomString(), candidateuserapp);

        assigneeTask = await tasksService.createAndClaimTask(StringUtil.generateRandomString(), candidateuserapp);

        toBeCompletedTask = await tasksService.createAndClaimTask(StringUtil.generateRandomString(), candidateuserapp);

        await tasksService.createAndClaimTask(assignedTaskName, candidateuserapp);

        await tasksService.createAndCompleteTask(completedTaskName, candidateuserapp);

        const processDefinition = await processDefinitionService.getProcessDefinitions(candidateuserapp);
        completedProcess = await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp);
        const task = await queryService.getProcessInstanceTasks(completedProcess.entry.id, candidateuserapp);
        claimedTask = await tasksService.claimTask(task.list.entries[0].entry.id, candidateuserapp);

        await settingsPage.setProviderBpmSso(
            browser.params.config.bpmHost,
            browser.params.config.oauth2.host,
            browser.params.config.identityHost);
        loginSSOPage.loginSSOIdentityService(browser.params.identityUser.email, browser.params.identityUser.password);
        done();

    }, 5 * 60 * 1000);

    describe('Complete task - cloud directive', () => {
        beforeEach(() => {
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(candidateuserapp);
        });

        it('[C307093] Complete button is not displayed when the task is already completed', () => {
            tasksCloudDemoPage.completedTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('Completed Tasks');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(completedTaskName);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(completedTaskName);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsNotDisplayed();
        });

        it('[C307095] Task can not be completed by owner user', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');
            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(createdTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(createdTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsNotDisplayed();
        });

        it('[C307110] Task list is displayed after clicking on Cancel button', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(assigneeTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(assigneeTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().clickCancelButton();

            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(assigneeTask.entry.name);
        });

        it('[C307094] Standalone Task can be completed by a user that is owner and assignee', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toBeCompletedTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toBeCompletedTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsDisplayed().clickCompleteButton();
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsNotDisplayedByName(toBeCompletedTask.entry.name);

            tasksCloudDemoPage.completedTasksFilter().clickTaskFilter();
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toBeCompletedTask.entry.name);
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsNotDisplayed();
        });

        it('[C307111] Task of a process can be completed by a user that is owner and assignee', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(claimedTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(claimedTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsDisplayed().clickCompleteButton();
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsNotDisplayedByName(claimedTask.entry.name);

            tasksCloudDemoPage.completedTasksFilter().clickTaskFilter();
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(claimedTask.entry.name);
            taskDetailsCloudDemoPage.taskFormCloud().checkCompleteButtonIsNotDisplayed();
        });
    });

    describe('Claim task - cloud directive', () => {

        let toClaimTask, toReleaseTask, toClaimProcessTask, toClaimProcessWithCandidateUserTask, toReleaseAndClaimTask;

        beforeAll(async (done) => {
            toClaimTask = await tasksService.createStandaloneTask(StringUtil.generateRandomString(), candidateuserapp);

            toReleaseTask = await tasksService.createAndClaimTask(StringUtil.generateRandomString(), candidateuserapp);

            toReleaseAndClaimTask = await tasksService.createAndClaimTask(StringUtil.generateRandomString(), candidateuserapp);

            const processDefinition = await processDefinitionService.getProcessDefinitions(simpleApp);
            const process = await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, simpleApp);
            toClaimProcessTask = await queryService.getProcessInstanceTasks(process.entry.id, simpleApp);

            const assignedProcessDefinition = await processDefinitionService.getProcessDefinitions(candidateuserapp);
            const processWithCandidateUser = await processInstancesService.createProcessInstance(assignedProcessDefinition.list.entries[0].entry.key, candidateuserapp);
            toClaimProcessWithCandidateUserTask = await queryService.getProcessInstanceTasks(processWithCandidateUser.entry.id, candidateuserapp);

            const candidateGroupProcessDefinition = await processDefinitionService.getProcessDefinitionByName(
                resources.ACTIVITI7_APPS.CANDIDATE_USER_APP.processes.candidateGroupProcess, candidateuserapp);
            candidateGroupProcess = await processInstancesService.createProcessInstance(candidateGroupProcessDefinition.entry.key, candidateuserapp);
            candidateGroupTask = await queryService.getProcessInstanceTasks(candidateGroupProcess.entry.id, candidateuserapp);
            await tasksService.claimTask(candidateGroupTask.list.entries[0].entry.id, candidateuserapp);

            const assignedUserProcessDefinition = await processDefinitionService.getProcessDefinitionByName(
                resources.ACTIVITI7_APPS.CANDIDATE_USER_APP.processes.assigneeProcess, candidateuserapp);
            const assigneeUserProcess = await processInstancesService.createProcessInstance(assignedUserProcessDefinition.entry.key, candidateuserapp);
            assigneeUserTask = await queryService.getProcessInstanceTasks(assigneeUserProcess.entry.id, candidateuserapp);

            done();
        });

        beforeEach(() => {
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(candidateuserapp);

        });

        it('[C307032] Should display the appropriate title for the unclaim option of a Task', async () => {
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(candidateuserapp);
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(assigneeTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(assigneeTask.entry.name);
            expect(taskDetailsCloudDemoPage.getReleaseButtonText()).toBe('RELEASE');
        });

        it('[C306869] Should be able to Claim a standalone task', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');
            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toClaimTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toClaimTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkClaimButtonIsDisplayed().clickClaimButton();

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toClaimTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toClaimTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('ASSIGNED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('admin.adf');
        });

        it('[C306870] Should be able to Release a standalone task', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkReleaseButtonIsDisplayed().clickReleaseButton();

            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('CREATED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('No assignee');
        });

        it('[C310149] Should be able to Release and Claim a standalone task', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseAndClaimTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseAndClaimTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkReleaseButtonIsDisplayed().clickReleaseButton();

            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseAndClaimTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseAndClaimTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('CREATED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('No assignee');

            taskDetailsCloudDemoPage.taskFormCloud().checkClaimButtonIsDisplayed().clickClaimButton();

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseAndClaimTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseAndClaimTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('ASSIGNED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('admin.adf');
        });

        // ADF-4314
        xit('[C306871] Should be able to Claim a process task which has no assignee', () => {
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(simpleApp);

            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');
            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(toClaimProcessTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(toClaimProcessTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkClaimButtonIsDisplayed().clickClaimButton();

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(toClaimProcessTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(toClaimProcessTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('ASSIGNED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('admin.adf');
        });

        it('[C306874] Should be able to Claim and Release a process task which has a candidate user', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');
            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(toClaimProcessWithCandidateUserTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(toClaimProcessWithCandidateUserTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkClaimButtonIsDisplayed().clickClaimButton();

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(toClaimProcessWithCandidateUserTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(toClaimProcessWithCandidateUserTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('ASSIGNED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('admin.adf');

            taskDetailsCloudDemoPage.taskFormCloud().checkReleaseButtonIsDisplayed().clickReleaseButton();

            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedByName(toReleaseTask.entry.name);
            tasksCloudDemoPage.taskListCloudComponent().selectRow(toReleaseTask.entry.name);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();

            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('CREATED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('No assignee');
        });

        // ADF-4602
        xit('[C306872] Should be able to Release a process task which has assignee', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(assigneeUserTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(assigneeUserTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkReleaseButtonIsDisplayed().clickReleaseButton();

            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(assigneeUserTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(assigneeUserTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('CREATED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('No assignee');
        });

        it('[C306875] Should be able to Claim/Release a process task which has a candidate group', () => {
            tasksCloudDemoPage.myTasksFilter().clickTaskFilter();
            expect(tasksCloudDemoPage.getActiveFilterName()).toBe('My Tasks');

            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(candidateGroupTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(candidateGroupTask.list.entries[0].entry.id);
            taskDetailsCloudDemoPage.checkTaskDetailsHeaderIsDisplayed();
            taskDetailsCloudDemoPage.taskFormCloud().checkReleaseButtonIsDisplayed().clickReleaseButton();

            tasksCloudDemoPage.editTaskFilterCloudComponent().clickCustomiseFilterHeader().clearAssignee().setStatusFilterDropDown('CREATED');
            tasksCloudDemoPage.taskListCloudComponent().checkContentIsDisplayedById(candidateGroupTask.list.entries[0].entry.id);
            tasksCloudDemoPage.taskListCloudComponent().selectRowById(candidateGroupTask.list.entries[0].entry.id);
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getStatus()).toEqual('CREATED');
            expect(taskDetailsCloudDemoPage.taskHeaderCloud().getAssignee()).toEqual('No assignee');
        });
    });
});
